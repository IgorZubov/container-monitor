import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './pages/Dashboard.js';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
