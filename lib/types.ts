export type Order = {
  workType: string | null;       // курсовая/реферат/диплом/эссе/другое
  topic: string | null;          // предмет/тема
  deadline: string | null;       // ISO YYYY-MM-DD (или текст)
  requirements: string | null;   // ГОСТ, объём, уникальность...
  materials: string | null;      // ссылки/файлы/нет
  contacts: string | null;       // @tg / email / phone
  notes: string | null;          // любые уточнения
};

export type LeadLabel = "hot" | "warm" | "cold" | "spam";

export type LeadScore = {
  score: number;        // 0..100
  label: LeadLabel;
  nextAction: string;   // что уточнить / что сделать
};

export type ExtractResult = {
  order: Order;
  missing: (keyof Order)[];
  clarifyingQuestion: string;
  lead: LeadScore;
};
