export type AlertEvent = {
  serviceName: string;
  fromStatus: string | null;
  toStatus: string;
};

async function sendTelegram(event: AlertEvent): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const emoji = event.toStatus === 'running' ? '✅' : '🔴';
  const text = `${emoji} *${event.serviceName}* is now *${event.toStatus}*`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });

  if (!res.ok) {
    console.error(`[alerts] Telegram sendMessage failed: ${res.status} ${res.statusText}`);
  }
}

async function sendWebhook(event: AlertEvent): Promise<void> {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    console.error(`[alerts] webhook POST failed: ${res.status} ${res.statusText}`);
  }
}

export async function sendAlerts(event: AlertEvent): Promise<void> {
  await Promise.allSettled([sendTelegram(event), sendWebhook(event)]);
}
