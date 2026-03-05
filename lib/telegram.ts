import { Order, LeadScore } from "./types";

function escapeHtml(s: string) {
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

export function formatForTelegram(sessionId: string, order: Order, lead: LeadScore) {
  const emoji = lead.label === "hot" ? "🔥" : lead.label === "warm" ? "🟡" : lead.label === "cold" ? "🔵" : "🗑️";
  const lines = [
    `<b>${emoji} ${lead.label.toUpperCase()} (${lead.score}/100)</b>`,
    "",
    `<b>Тип:</b> ${escapeHtml(order.workType ?? "—")}`,
    `<b>Тема:</b> ${escapeHtml(order.topic ?? "—")}`,
    `<b>Срок:</b> ${escapeHtml(order.deadline ?? "—")}`,
    `<b>Требования:</b> ${escapeHtml(order.requirements ?? "—")}`,
    `<b>Материалы:</b> ${escapeHtml(order.materials ?? "—")}`,
    `<b>Контакты:</b> ${escapeHtml(order.contacts ?? "—")}`,
    "",
    `<b>Следующий шаг:</b> ${escapeHtml(lead.nextAction)}`,
    `<i>session:</i> ${escapeHtml(sessionId)}`,
  ];
  return lines.join("\n");
}

export async function sendToTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in env");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
}
