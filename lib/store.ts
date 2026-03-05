import { Order } from "./types";

export type Draft = {
  sessionId: string;
  order: Order;
  status: "DRAFT" | "CONFIRM" | "DONE";
  updatedAt: number;
};

const mem = new Map<string, Draft>();

export function getDraft(sessionId: string): Draft {
  const d = mem.get(sessionId);
  if (d) return d;

  const fresh: Draft = {
    sessionId,
    status: "DRAFT",
    updatedAt: Date.now(),
    order: {
      workType: null,
      topic: null,
      deadline: null,
      requirements: null,
      materials: null,
      contacts: null,
      notes: null,
    },
  };
  mem.set(sessionId, fresh);
  return fresh;
}

export function saveDraft(d: Draft) {
  d.updatedAt = Date.now();
  mem.set(d.sessionId, d);
}
