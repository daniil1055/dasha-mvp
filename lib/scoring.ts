import { LeadScore, Order } from "./types";

function hasContact(order: Order) {
  const c = (order.contacts || "").trim();
  return c.startsWith("@") || /@/.test(c) || /\+?\d{7,}/.test(c);
}

export function scoreLead(order: Order): LeadScore {
  let score = 0;

  if (hasContact(order)) score += 25;
  if (order.deadline && order.deadline.trim()) score += 20;
  if (order.requirements && order.requirements.trim().length >= 5) score += 15;
  if (order.materials && order.materials.trim().length >= 2 && order.materials.toLowerCase() !== "нет") score += 10;
  if (order.topic && order.topic.trim().length >= 3) score += 10;
  if (order.workType && order.workType.trim().length >= 3) score += 10;

  // crude spam signals
  const joined = [order.workType, order.topic, order.requirements, order.materials, order.contacts, order.notes].join(" ").toLowerCase();
  if (/viagra|casino|crypto\s*airdrop|free\s*money|sex|porn/.test(joined)) score -= 60;

  score = Math.max(0, Math.min(100, score));

  let label: LeadScore["label"] = "cold";
  if (score >= 70) label = "hot";
  else if (score >= 45) label = "warm";
  else if (score < 15) label = "spam";

  const nextAction =
    !hasContact(order) ? "Попросить контакт (Telegram @ник / email) — без него заявку не брать." :
    !order.deadline ? "Уточнить дедлайн (дата/время)." :
    !order.requirements ? "Уточнить требования (объём/ГОСТ/уникальность/оформление)." :
    "Можно брать в работу / уточнить детали по методичке.";

  return { score, label, nextAction };
}
