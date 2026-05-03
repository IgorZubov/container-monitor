import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './pages/Dashboard.js';
import { Settings } from './pages/Settings.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';

type Page = 'dashboard' | 'settings';
type AuthView = 'login' | 'register';

function App() {
  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('jwt'));
  const [authView, setAuthView] = useState<AuthView>('login');
  const [page, setPage] = useState<Page>('dashboard');
  const [onboardToken, setOnboardToken] = useState<string | null>(null);

  if (!jwt) {
    return authView === 'login'
      ? <Login onLogin={setJwt} onGoRegister={() => setAuthView('register')} />
      : <Register
          onRegister={(token, agentToken) => { setJwt(token); setOnboardToken(agentToken); }}
          onGoLogin={() => setAuthView('login')}
        />;
  }

  const logout = () => { localStorage.removeItem('jwt'); setJwt(null); };

  return (
    <>
      <nav style={{
        borderBottom: '1px solid #e5e7eb', padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 24, height: 48,
        fontFamily: 'system-ui, sans-serif', fontSize: 14,
      }}>
        <strong style={{ marginRight: 8 }}>StackWatch</strong>
        {(['dashboard', 'settings'] as Page[]).map((p) => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
            color: page === p ? '#2563eb' : '#374151',
            fontWeight: page === p ? 600 : 400,
            borderBottom: page === p ? '2px solid #2563eb' : '2px solid transparent',
            padding: '0 2px', height: 48,
          }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <button onClick={logout} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
          Sign out
        </button>
      </nav>

      {onboardToken && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, margin: '16px 16px 0', padding: '12px 16px', fontFamily: 'system-ui, sans-serif' }}>
          <strong style={{ fontSize: 14 }}>Your agent token</strong>
          <p style={{ margin: '6px 0 4px', fontSize: 13, color: '#374151' }}>
            Copy this now — it won't be shown again. Set it as <code>AGENT_TOKEN</code> in your agent's environment.
          </p>
          <code style={{ fontSize: 13, background: '#dbeafe', padding: '4px 8px', borderRadius: 4, display: 'block', wordBreak: 'break-all' }}>
            {onboardToken}
          </code>
          <button onClick={() => setOnboardToken(null)} style={{ marginTop: 8, fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Dismiss
          </button>
        </div>
      )}

      {page === 'dashboard' ? <Dashboard /> : <Settings />}
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(<StrictMode><App /></StrictMode>);
