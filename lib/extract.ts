import { z } from "zod";
import { ExtractResult, Order } from "./types";
import { scoreLead } from "./scoring";

const OrderSchema = z.object({
  workType: z.string().nullable(),
  topic: z.string().nullable(),
  deadline: z.string().nullable(),
  requirements: z.string().nullable(),
  materials: z.string().nullable(),
  contacts: z.string().nullable(),
  notes: z.string().nullable(),
});

const ExtractSchema = z.object({
  order: OrderSchema,
  missing: z.array(z.enum(["workType","topic","deadline","requirements","materials","contacts","notes"])).default([]),
  clarifyingQuestion: z.string(),
});

function normalizeWorkType(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("курсов")) return "курсовая";
  if (t.includes("рефера")) return "реферат";
  if (t.includes("диплом")) return "диплом";
  if (t.includes("эссе")) return "эссе";
  if (t.includes("практик")) return "отчёт по практике";
  return null;
}

function guessTopic(text: string): string | null {
  const m = text.match(/\bпо\s+([^,.;\n]+)/i);
  return m ? m[1].trim() : null;
}

function toISODateFromDay(day: number, now: Date): string | null {
  if (!(day >= 1 && day <= 31)) return null;
  const y = now.getFullYear();
  const m = now.getMonth();
  const sameMonth = new Date(y, m, day);
  const target = sameMonth >= now ? sameMonth : new Date(y, m + 1, day);
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${target.getFullYear()}-${mm}-${dd}`;
}

function guessDeadline(text: string, now: Date): string | null {
  const m = text.match(/\b(?:до|к)?\s*(\d{1,2})\s*(?:-?го|\s*числа)?\b/i);
  if (!m) return null;
  const day = Number(m[1]);
  return toISODateFromDay(day, now);
}

function extractContacts(text: string): string | null {
  const at = text.match(/@([a-zA-Z0-9_]{4,})/);
  if (at) return "@" + at[1];
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) return email[0];
  const phone = text.match(/\+?\d[\d\s\-()]{7,}\d/);
  if (phone) return phone[0].replace(/\s+/g, " ");
  return null;
}

function computeMissing(order: Order): (keyof Order)[] {
  const keys: (keyof Order)[] = ["workType","topic","deadline","requirements","materials","contacts"];
  return keys.filter((k) => !order[k] || String(order[k]).trim().length === 0);
}

function buildQuestion(missing: (keyof Order)[]): string {
  const priority: (keyof Order)[] = ["contacts","requirements","deadline","materials","topic","workType"];
  const ask = priority.filter((k) => missing.includes(k)).slice(0, 2);

  const parts = ask.map((k) => {
    if (k === "contacts") return "контакт для связи (Telegram @ник / email)";
    if (k === "requirements") return "требования (объём/ГОСТ/уникальность/оформление)";
    if (k === "deadline") return "точный дедлайн (дата/время)";
    if (k === "materials") return "есть ли методичка/материалы (ссылка/файл) или пока нет";
    if (k === "topic") return "предмет и тему (если темы нет — хотя бы предмет)";
    if (k === "workType") return "тип работы (курсовая/реферат/диплом/эссе)";
    return String(k);
  });

  if (!parts.length) return "Если всё верно — напиши «да», и я отправлю заявку.";
  return "Уточни, пожалуйста: " + parts.join(" и ") + ".";
}

function heuristicExtract(userMessage: string, previous: Order, now: Date): ExtractResult {
  const next: Order = { ...previous };

  const wt = normalizeWorkType(userMessage);
  if (wt) next.workType = wt;

  const dl = guessDeadline(userMessage, now);
  if (dl) next.deadline = dl;

  const tp = guessTopic(userMessage);
  if (tp && (!next.topic || next.topic.length < 2)) next.topic = tp;

  const c = extractContacts(userMessage);
  if (c) next.contacts = c;

  if (/гост|уникальн|страниц|объ[её]м|оформлен/i.test(userMessage)) {
    next.requirements = (next.requirements ? next.requirements + "; " : "") + userMessage.trim();
  }
  if (/методичк|ссылк|файл|документ|pdf/i.test(userMessage)) {
    next.materials = (next.materials ? next.materials + "; " : "") + userMessage.trim();
  }

  const missing = computeMissing(next);
  const clarifyingQuestion = buildQuestion(missing);
  const lead = scoreLead(next);

  return { order: next, missing, clarifyingQuestion, lead };
}

async function openaiExtract(userMessage: string, previous: Order, nowISO: string): Promise<ExtractResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  const prompt = `
Ты — менеджер DaSha. Прими сообщение студента и обнови черновик заказа.
Верни ТОЛЬКО валидный JSON.

Текущая дата: ${nowISO}
Предыдущий заказ: ${JSON.stringify(previous)}
Сообщение: ${JSON.stringify(userMessage)}

JSON-формат:
{
  "order": {"workType": string|null, "topic": string|null, "deadline": string|null, "requirements": string|null, "materials": string|null, "contacts": string|null, "notes": string|null},
  "missing": ["workType"|"topic"|"deadline"|"requirements"|"materials"|"contacts"|"notes"],
  "clarifyingQuestion": string
}

Правила:
- Нормализуй workType: курсовая/реферат/диплом/эссе/другое.
- Если пользователь пишет "до 15-го" — преобразуй в ISO YYYY-MM-DD с опорой на текущую дату.
- Если чего-то нет — null.
- missing перечисли по факту (пустые обязательные поля).
- clarifyingQuestion: 1 короткое сообщение, 1–2 уточнения максимум.
`.trim();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, input: prompt }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data: any = await res.json();
  const text: string = data?.output_text || "";
  const parsed = ExtractSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("LLM JSON validation failed");

  const order = parsed.data.order as Order;
  const missing = computeMissing(order);
  const clarifyingQuestion = parsed.data.clarifyingQuestion || buildQuestion(missing);
  const lead = scoreLead(order);

  return { order, missing, clarifyingQuestion, lead };
}

export async function extract(opts: { userMessage: string; previous: Order; nowISO: string; }): Promise<ExtractResult> {
  const provider = (process.env.LLM_PROVIDER || "").toLowerCase();
  const hasKey = Boolean(process.env.OPENAI_API_KEY);

  if (provider === "openai" && hasKey) {
    try {
      return await openaiExtract(opts.userMessage, opts.previous, opts.nowISO);
    } catch {
      // fallback
      return heuristicExtract(opts.userMessage, opts.previous, new Date(opts.nowISO));
    }
  }

  return heuristicExtract(opts.userMessage, opts.previous, new Date(opts.nowISO));
}
