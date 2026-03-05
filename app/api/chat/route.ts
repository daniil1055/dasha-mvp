import { NextRequest, NextResponse } from "next/server";
import { getDraft, saveDraft } from "@/lib/store";
import { extract } from "@/lib/extract";
import { formatForTelegram, sendToTelegram } from "@/lib/telegram";

function summary(order: any) {
  return [
    "Проверь заявку:",
    "",
    `• Тип: ${order.workType ?? "—"}`,
    `• Тема: ${order.topic ?? "—"}`,
    `• Срок: ${order.deadline ?? "—"}`,
    `• Требования: ${order.requirements ?? "—"}`,
    `• Материалы: ${order.materials ?? "—"}`,
    `• Контакты: ${order.contacts ?? "—"}`,
    "",
    "Если всё верно — напиши «да». Если нужно исправить — напиши, что поменять.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();
    const sid = String(sessionId || "").trim();
    const msg = String(message || "").trim();

    if (!sid) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const draft = getDraft(sid);

    if (!msg) {
      const app = process.env.APP_NAME || "DaSha";
      return NextResponse.json({
        reply: `Здравствуйте! Я ${app} — виртуальный помощник для студентов.\nОпиши задачу свободным текстом (пример: «Мне нужна курсовая по маркетингу до 15-го»).`,
        order: draft.order,
        lead: { score: 0, label: "cold", nextAction: "Опиши задачу." },
        status: draft.status,
      });
    }

    if (draft.status === "DONE") {
      return NextResponse.json({ reply: "Заявка уже отправлена ✅", order: draft.order, status: draft.status });
    }

    // If waiting for confirmation and user says yes => send
    const low = msg.toLowerCase();
    if (draft.status === "CONFIRM" && (low === "да" || low === "ок" || low === "верно")) {
      // If no contacts, force ask (anti-trash)
      if (!draft.order.contacts || draft.order.contacts.trim().length < 3) {
        draft.status = "DRAFT";
        saveDraft(draft);
        return NextResponse.json({
          reply: "Перед отправкой нужен контакт для связи (Telegram @ник / email). Напиши, пожалуйста.",
          order: draft.order,
          status: draft.status,
        });
      }

      const extractedLead = (await extract({ userMessage: "", previous: draft.order, nowISO: new Date().toISOString() })).lead;
      const text = formatForTelegram(sid, draft.order, extractedLead);
      await sendToTelegram(text);

      draft.status = "DONE";
      saveDraft(draft);
      return NextResponse.json({ reply: "Готово! Заявка отправлена ✅", order: draft.order, lead: extractedLead, status: draft.status });
    }

    // Normal message: update order
    const res = await extract({ userMessage: msg, previous: draft.order, nowISO: new Date().toISOString() });
    draft.order = res.order;

    // If all required fields present, ask to confirm (but enforce contact required for sending)
    if (res.missing.length === 0) {
      draft.status = "CONFIRM";
      saveDraft(draft);
      return NextResponse.json({ reply: summary(draft.order), order: draft.order, lead: res.lead, status: draft.status });
    }

    draft.status = "DRAFT";
    saveDraft(draft);
    return NextResponse.json({ reply: res.clarifyingQuestion, order: draft.order, lead: res.lead, status: draft.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
