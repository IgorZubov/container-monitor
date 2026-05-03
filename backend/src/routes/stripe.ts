import type { FastifyInstance } from 'fastify';
import { db } from '../db/schema.js';
import { verifyJwt } from './auth.js';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';

const getUserById = db.prepare<[string], { id: string; email: string; stripe_customer_id: string | null }>(
  `SELECT id, email, stripe_customer_id FROM users WHERE id = ?`
);
const setStripeCustomer = db.prepare(
  `UPDATE users SET stripe_customer_id = @cid WHERE id = @id`
);
const setSubscription = db.prepare(
  `UPDATE users SET stripe_sub_id = @sub_id, plan = @plan WHERE stripe_customer_id = @cid`
);

async function stripePost(path: string, body: Record<string, string>): Promise<unknown> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`Stripe ${path} failed: ${res.status}`);
  return res.json();
}

export async function stripeRoutes(app: FastifyInstance): Promise<void> {
  // Create a Stripe Checkout session for the $3/mo subscription
  app.post('/stripe/checkout', async (req, reply) => {
    const jwt = req.headers.authorization?.replace('Bearer ', '') ?? '';
    const userId = verifyJwt(jwt);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const user = getUserById.get(userId);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripePost('/customers', { email: user.email }) as { id: string };
      customerId = customer.id;
      setStripeCustomer.run({ cid: customerId, id: userId });
    }

    const session = await stripePost('/checkout/sessions', {
      customer: customerId,
      mode: 'subscription',
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      success_url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}?subscribed=1`,
      cancel_url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}?cancelled=1`,
    }) as { url: string };

    return reply.send({ url: session.url });
  });

  // Stripe sends events here; verify signature then update user plan
  app.post('/stripe/webhook', { config: { rawBody: true } }, async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;

    // Lightweight HMAC verification without the Stripe SDK
    const { createHmac } = await import('node:crypto');
    const parts = sig.split(',').reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.split('=');
      acc[k] = v;
      return acc;
    }, {});
    const payload = `${parts['t']}.${rawBody.toString()}`;
    const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(payload).digest('hex');
    if (expected !== parts['v1']) return reply.status(400).send({ error: 'Bad signature' });

    const event = JSON.parse(rawBody.toString()) as { type: string; data: { object: { customer: string; id: string; status: string } } };

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const plan = sub.status === 'active' ? 'pro' : 'free';
      setSubscription.run({ sub_id: sub.id, plan, cid: sub.customer });
    }

    if (event.type === 'customer.subscription.deleted') {
      setSubscription.run({ sub_id: null, plan: 'free', cid: event.data.object.customer });
    }

    return reply.status(200).send({ received: true });
  });
}
