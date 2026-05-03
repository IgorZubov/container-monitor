import type { FastifyInstance } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '../db/schema.js';

// bcrypt-free password hashing: PBKDF2 via Node crypto (no native addon needed)
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${password}:${process.env.JWT_SECRET ?? ''}`).digest('hex');
}

function makeId(): string {
  return randomBytes(16).toString('hex');
}

function makeToken(): string {
  return randomBytes(24).toString('hex');
}

function makeJwt(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${payload}.${process.env.JWT_SECRET ?? ''}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyJwt(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHash('sha256').update(`${header}.${payload}.${process.env.JWT_SECRET ?? ''}`).digest('base64url');
  if (sig !== expected) return null;
  try {
    const { sub } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub: string };
    return sub;
  } catch {
    return null;
  }
}

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash) VALUES (@id, @email, @password_hash)`
);
const getUserByEmail = db.prepare<[string], { id: string; password_hash: string; email: string }>(
  `SELECT id, email, password_hash FROM users WHERE email = ?`
);
const insertToken = db.prepare(
  `INSERT INTO agent_tokens (token, user_id, label) VALUES (@token, @user_id, @label)`
);
const getTokensByUser = db.prepare<[string], { token: string; label: string; created_at: number }>(
  `SELECT token, label, created_at FROM agent_tokens WHERE user_id = ? ORDER BY created_at DESC`
);

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email: string; password: string } }>('/auth/register', async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password || password.length < 8) {
      return reply.status(400).send({ error: 'Email and password (min 8 chars) required' });
    }
    const existing = getUserByEmail.get(email);
    if (existing) return reply.status(409).send({ error: 'Email already registered' });

    const salt = makeId();
    const id = makeId();
    insertUser.run({ id, email, password_hash: `${salt}:${hashPassword(password, salt)}` });

    const token = makeToken();
    insertToken.run({ token, user_id: id, label: 'default' });

    return reply.status(201).send({ token: makeJwt(id), agentToken: token });
  });

  app.post<{ Body: { email: string; password: string } }>('/auth/login', async (req, reply) => {
    const { email, password } = req.body;
    const user = getUserByEmail.get(email);
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

    const [salt, hash] = user.password_hash.split(':');
    if (hashPassword(password, salt) !== hash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    return reply.send({ token: makeJwt(user.id) });
  });

  app.get('/auth/tokens', async (req, reply) => {
    const jwt = req.headers.authorization?.replace('Bearer ', '') ?? '';
    const userId = verifyJwt(jwt);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    return reply.send({ tokens: getTokensByUser.all(userId) });
  });

  app.post<{ Body: { label?: string } }>('/auth/tokens', async (req, reply) => {
    const jwt = req.headers.authorization?.replace('Bearer ', '') ?? '';
    const userId = verifyJwt(jwt);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const token = makeToken();
    insertToken.run({ token, user_id: userId, label: req.body.label ?? 'agent' });
    return reply.status(201).send({ token });
  });
}
