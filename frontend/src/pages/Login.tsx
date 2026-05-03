import { useState } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginTop: 4,
};

interface Props {
  onLogin: (jwt: string) => void;
  onGoRegister: () => void;
}

export function Login({ onLogin, onGoRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const { error: msg } = await res.json() as { error: string };
      setError(msg ?? 'Login failed');
      return;
    }
    const { token } = await res.json() as { token: string };
    localStorage.setItem('jwt', token);
    onLogin(token);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 360, margin: '80px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24, fontSize: 22 }}>Sign in to StackWatch</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Email
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Password
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" style={{ padding: '9px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>
          Sign in
        </button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: '#6b7280' }}>
        No account?{' '}
        <button onClick={onGoRegister} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, padding: 0 }}>
          Create one
        </button>
      </p>
    </div>
  );
}
