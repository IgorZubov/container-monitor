import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './pages/Dashboard.js';
import { Settings } from './pages/Settings.js';

type Page = 'dashboard' | 'settings';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

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
      </nav>
      {page === 'dashboard' ? <Dashboard /> : <Settings />}
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
