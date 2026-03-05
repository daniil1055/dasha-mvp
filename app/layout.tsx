import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DaSha • Приём заявок",
  description: "Сайт помощи в студенческих работах + AI-менеджер + отправка в Telegram",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
