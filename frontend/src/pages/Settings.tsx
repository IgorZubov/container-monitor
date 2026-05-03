import { useEffect, useState } from 'react';

interface Settings {
  telegramBotToken: string;
  telegramChatId: string;
  webhookUrl: string;
  pollIntervalMs: number;
  warnDaysBefore: number;
  diskWarnThreshold: number;
  diskCriticalThreshold: number;
}

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151',
};

export function Settings() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/settings`)
      .then((r) => r.json())
      .then((d: Settings) => setForm(d))
      .catch(() => {});
  }, []);

  if (!form) return <p style={{ padding: 24, color: '#6b7280' }}>Loading settings…</p>;

  const set = (key: keyof Settings, value: string | number) =>
    setForm((f) => f ? { ...f, [key]: value } : f);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${BACKEND}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 20 }}>Settings</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <h3 style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Telegram Alerts</h3>
          <label style={labelStyle}>Bot Token<input style={fieldStyle} value={form.telegramBotToken} onChange={(e) => set('telegramBotToken', e.target.value)} placeholder="123456:ABC-..." /></label>
          <label style={{ ...labelStyle, marginTop: 10 }}>Chat ID<input style={fieldStyle} value={form.telegramChatId} onChange={(e) => set('telegramChatId', e.target.value)} placeholder="-1001234567890" /></label>
        </section>

        <section>
          <h3 style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Webhook (Discord / Slack / ntfy)</h3>
          <label style={labelStyle}>Webhook URL<input style={fieldStyle} value={form.webhookUrl} onChange={(e) => set('webhookUrl', e.target.value)} placeholder="https://..." /></label>
        </section>

        <section>
          <h3 style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Thresholds</h3>
          <label style={labelStyle}>Poll Interval (ms)<input style={fieldStyle} type="number" value={form.pollIntervalMs} onChange={(e) => set('pollIntervalMs', Number(e.target.value))} /></label>
          <label style={{ ...labelStyle, marginTop: 10 }}>SSL Warn (days before expiry)<input style={fieldStyle} type="number" value={form.warnDaysBefore} onChange={(e) => set('warnDaysBefore', Number(e.target.value))} /></label>
          <label style={{ ...labelStyle, marginTop: 10 }}>Disk Warn %<input style={fieldStyle} type="number" value={form.diskWarnThreshold} onChange={(e) => set('diskWarnThreshold', Number(e.target.value))} /></label>
          <label style={{ ...labelStyle, marginTop: 10 }}>Disk Critical %<input style={fieldStyle} type="number" value={form.diskCriticalThreshold} onChange={(e) => set('diskCriticalThreshold', Number(e.target.value))} /></label>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>Save</button>
          {saved && <span style={{ color: '#22c55e', fontSize: 13 }}>Saved!</span>}
        </div>
      </form>
    </div>
  );
}
