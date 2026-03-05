"use client";

import { useEffect, useState } from "react";

type Msg = { role: "assistant" | "user"; text: string };
type Lead = { score: number; label: "hot" | "warm" | "cold" | "spam"; nextAction: string };

export default function Page() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<string>("DRAFT");

  async function callApi(message: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "API error");
    return data;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await callApi("");
        setMessages([{ role: "assistant", text: data.reply }]);
        setLead(data.lead ?? null);
        setOrder(data.order ?? null);
        setStatus(data.status ?? "DRAFT");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((p) => [...p, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const data = await callApi(text);
      setMessages((p) => [...p, { role: "assistant", text: data.reply }]);
      setLead(data.lead ?? lead);
      setOrder(data.order ?? order);
      setStatus(data.status ?? status);
    } finally {
      setLoading(false);
    }
  }

  const badgeText = lead ? `${lead.label.toUpperCase()} • ${lead.score}/100` : "SCORE • —";
  const badgeEmoji = !lead ? "⚪" : lead.label === "hot" ? "🔥" : lead.label === "warm" ? "🟡" : lead.label === "cold" ? "🔵" : "🗑️";

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div className="badge">{badgeEmoji} <b>{badgeText}</b></div>
          <h1 style={{ margin: "10px 0 0", fontSize: 28 }}>DaSha — AI-менеджер заявок</h1>
          <div className="small" style={{ marginTop: 6, maxWidth: 680 }}>
            Пиши свободным текстом. DaSha извлечёт: тип → тема → срок → требования → материалы → контакты.
            Затем попросит подтверждение и отправит заявку в Telegram.
          </div>
        </div>
        <div className="small" style={{ textAlign: "right" }}>
          <div><b>session</b>: {sessionId.slice(0, 8)}</div>
          <div><b>status</b>: {status}</div>
        </div>
      </header>

      <section className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Как это работает</h2>
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Опиши задачу одной фразой (например: «Курсовая по маркетингу до 15-го»).</li>
            <li>DaSha задаст 1–2 уточнения (не будет “допроса”).</li>
            <li>Покажет сводку → ты пишешь «да».</li>
            <li>Заявка улетает в Telegram-канал.</li>
          </ol>

          <hr />

          <h3 style={{ margin: "0 0 8px" }}>Черновик заказа</h3>
          <div className="small" style={{ lineHeight: 1.55 }}>
            <div><b>Тип:</b> {order?.workType ?? "—"}</div>
            <div><b>Тема:</b> {order?.topic ?? "—"}</div>
            <div><b>Срок:</b> {order?.deadline ?? "—"}</div>
            <div><b>Требования:</b> {order?.requirements ?? "—"}</div>
            <div><b>Материалы:</b> {order?.materials ?? "—"}</div>
            <div><b>Контакты:</b> {order?.contacts ?? "—"}</div>
          </div>

          <hr />

          <div className="small">
            <b>Важно:</b> без контакта заявка не отправляется (фильтр мусора).
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0 }}>Чат</h2>
            <div className="small">Совет: дай @ник сразу — быстрее</div>
          </div>

          <div className="chat">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
            ))}
            {loading && <div className="small">DaSha печатает…</div>}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
              placeholder="Напиши сообщение…"
            />
            <button className="btn" onClick={send} disabled={loading || !input.trim()}>
              Отправить
            </button>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            Если уже видишь сводку — просто напиши <b>«да»</b>.
          </div>
        </div>
      </section>

      <footer className="small" style={{ opacity: 0.75 }}>
        MVP. Следующий шаг: база (PostgreSQL), файлы (Storage), личные кабинеты и статусы.
      </footer>
    </main>
  );
}
