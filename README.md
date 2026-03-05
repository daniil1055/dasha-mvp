# DaSha Current MVP (Vercel-ready)

## Что внутри
- Лендинг + чат (Next.js App Router)
- Студент пишет свободным текстом
- Извлечение данных заказа:
  - если есть OPENAI_API_KEY → умный разбор через OpenAI
  - иначе → простой парсер (fallback)
- Lead Scoring (0–100) + метка hot/warm/cold/spam
- Фильтр мусора: без контакта заявка не отправляется
- После подтверждения "да" → отправка заявки в Telegram канал (ботом)

## Запуск локально
```bash
npm i
cp .env.example .env.local
npm run dev
```

## Для Telegram
Vercel → Project Settings → Environment Variables:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID

(опционально для LLM)
- LLM_PROVIDER=openai
- OPENAI_API_KEY
- OPENAI_MODEL

После изменения env → Redeploy.
