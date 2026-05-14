# Quantum Dagestan

Платформа для бизнес-сообществ и клубов. SRS v1.0.

## Стек

- **Backend:** Node.js 20 + Fastify + Prisma + PostgreSQL 15 + Redis 7 + BullMQ
- **Web:** Next.js 14 (App Router) + Tailwind + React Query
- **Mobile:** Expo (React Native) + Expo Router + React Query + Zustand
- **Shared:** общие типы, енумы, zod-схемы, утилиты
- **Платежи:** ЮKassa (54-ФЗ receipts) · **Push:** FCM + Expo Notifications
- **Хостинг:** Yandex Cloud (152-ФЗ)

## Структура

```
.
├── packages/
│   ├── shared/   # @qd/shared — типы, схемы, константы
│   ├── api/      # @qd/api    — Fastify + Prisma
│   ├── web/      # @qd/web    — Next.js 14
│   └── mobile/   # @qd/mobile — Expo
├── docker-compose.yml  # Postgres + Redis для dev
├── pnpm-workspace.yaml
└── package.json
```

## Запуск (первый раз)

Требуется: Node 20+, pnpm 9+, Docker.

```bash
# 1. Установи зависимости
pnpm install

# 2. Подними БД и Redis
cp .env.example .env
pnpm infra:up

# 3. API: настрой env, применить миграции, засидить
cp packages/api/.env.example packages/api/.env
pnpm db:migrate    # создаст начальную миграцию
pnpm db:seed       # admin@quantum-dag.ru / Admin12345!

# 4. Запусти всё (в разных терминалах)
pnpm dev:api       # http://localhost:4000
pnpm dev:web       # http://localhost:3000
pnpm dev:mobile    # Expo dev server
```

## Что готово

| Слой         | Состояние                                                                          |
| ------------ | ---------------------------------------------------------------------------------- |
| Монорепо     | ✅ pnpm workspaces, tsconfig base, prettier, docker-compose                        |
| `shared`     | ✅ Типы, енумы, константы, zod-схемы, утилиты (валидаторы, форматы)                |
| `api` БД     | ✅ Полная Prisma-схема из SRS (9 моделей, 7 енумов, индексы)                       |
| `api` auth   | ✅ Telegram + email login (UC-01/02), **RTR с Redis allowlist**, logout, logout-all |
| `api` ЮKassa | ✅ Клиент createPayment с receipt (54-ФЗ), webhook с CIDR IP-whitelist, идемпотентность, push+email при payment.succeeded |
| `api` upload | ✅ Аватары: multipart → Sharp 400×400 JPEG (с EXIF rotate, HEIC) → S3              |
| `api` bot    | ✅ Admin-бот (Grammy.js): нотификации новых заявок + inline approve/reject с HMAC  |
| `api` jobs   | ✅ BullMQ cron-расписания (08:00 reminder, 00:01 past-events) + workers            |
| `api` push   | ✅ Expo Push API клиент, авто-деактивация мёртвых токенов, /members/me/push-token  |
| `api` email  | ✅ Unisender клиент, шаблоны activation/reset-password                             |
| `api` auth   | ✅ /auth/activate, /auth/forgot-password, /auth/reset-password (Redis OTT, 24/48ч) |
| `api` events | ✅ scheduleEventReminders/cancel в register/unregister + cancellation push         |
| `api` news   | ✅ Announcement → авто-push всем активным членам                                   |
| `api` apply  | ✅ SmartCaptcha серверная валидация                                                |
| `api` library| ✅ Модели + GIN-индекс по ts_vector (russian), поиск через websearch_to_tsquery   |
| `web` auth   | ✅ httpOnly cookies (server actions), /apply (4-step + SmartCaptcha), login, activate, reset, forgot, Telegram Widget |
| `web` cabinet| ✅ Лента+события, каталог участников (blur контактов), профиль с upload аватара, события (детальная+optimistic регистрация), библиотека с поиском+файлами, /privacy 152-ФЗ |
| `web` admin  | ✅ Дашборд с метриками, заявки (approve/reject), участники, события (создать+опубликовать+отменить), новости (announcement→push) |
| `mobile`     | ✅ 5 табов с реальными данными, infinite scroll, debounced search, offline-баннер, optimistic UI для регистрации, push lifecycle (Expo Notifications + permission flow + auto-register после login), экран входа: email/password форма с rate-limit handling + кнопка Telegram |

Легенда: ✅ готово · 🟡 каркас (TODO внутри файлов)

## Что осталось доделать (из 8 недель в SRS)

См. TODO-комментарии в коде. Ключевое:

**Backend — всё ключевое из SRS реализовано:**
RTR с Redis allowlist, ЮKassa + 54-ФЗ receipts + IP whitelist, Telegram admin-бот (approve/reject с HMAC),
Sharp+S3 аватары, Unisender email с активацией после approve, Expo Push + auto-deactivation мёртвых токенов,
BullMQ cron (membership expiry + past events), event reminders 24h/1h, cancellation push, announcement push,
SmartCaptcha, Library с GIN-индексом по russian ts_vector, /news Redis-кеш + HyperLogLog для прочтений.

**Web — все ключевые экраны готовы:**
4-step /apply с SmartCaptcha, /auth/* (login Telegram Widget + email, activate, forgot, reset),
/cabinet (лента, события, профиль+avatar upload, библиотека+файлы, каталог участников),
/admin (дашборд, заявки approve/reject, события CRUD+publish+cancel, новости, участники), /privacy 152-ФЗ.

**Mobile — все 5 табов реализованы:**
Главная (лента+события+offline-баннер), Участники (infinite scroll, debounced search, blur контактов),
События (optimistic UI регистрация с rollback), База знаний (категории+поиск+файлы), Профиль (членство+logout),
push lifecycle (Expo Notifications permission flow + auto-register после login).

**Безопасность / 152-ФЗ:**
- Хостинг в РФ (Yandex Cloud ru-central1, см. конфиг)
- Журнал согласий с consent_given_at + IP в applications
- /privacy страница + DELETE /members/me с анонимизацией User (PII обнуляются, isActive=false, blockReason=self_deleted) + удалением Member-профиля и push-токенов + revoke всех сессий
- Уведомление в РКН — оргмероприятие (вне кода)

**Что ещё стоит сделать перед продом:**
- Unit/integration тесты (vitest + supertest)
- Playwright E2E для критичных user flows (apply → approve → login → register на событие → оплата)
- CI/CD: `.github/workflows/ci.yml` запускает `prisma generate` + `pnpm -r typecheck` + `pnpm -r lint` на push/PR в main. Test/migrate-deploy ещё не подключены
- Sentry убран (был API+web), чтобы снизить нагрузку на 1 GB-сервер. Ошибки летят в pino-логи (`/var/log/qd/api.err`, `journalctl -u qd-api`)
- Грузовое тестирование БД на 1000+ активных пользователей

## Полезные команды

```bash
pnpm db:studio       # Prisma Studio — GUI БД
pnpm typecheck       # tsc --noEmit во всех пакетах
pnpm infra:logs      # логи Postgres + Redis
pnpm infra:down      # остановить инфру
```

## Тестовые учётки

После `pnpm db:seed`:
- **admin@quantum-dag.ru** / **Admin12345!** (role: admin, active membership)
