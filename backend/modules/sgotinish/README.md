# SGotinish

Telegram-first Student Government appeals (anon-chat style channel).

## User flow

1. Link NU Telegram on the website (once).
2. `/otinish` or `t.me/<bot>?start=otinish`
3. Pick a **ministry category** → one text message → card in student DM + ministry inbox
4. Student enters an **open channel** (one open ticket max)
5. SG member taps **Answer** → `start=otinish_t_<id>` → first claimer becomes assignee
6. While open, non-command DMs pipe both ways
7. Ministry chat: **status only** (claimed / closed)
8. `/close` with confirmation — unclaimed: student may abandon; claimed: only claimer

## Ministries / routing

Table `sg_ministries` (`slug`, `name`, `telegram_chat_id`, `is_active`):

| slug | Ministry |
|------|----------|
| education | Minister of Education |
| culture | Minister of Culture |
| research | Minister of Research and Innovations |
| residential | Minister of Residential Life and Security |
| sports | Minister of Sports and Health |
| student_rights | Student Rights Committee |
| student_fund | Student Fund Budget Committee |
| external_affairs | Minister of External Affairs |

`tickets.category` matches `sg_ministries.slug`. `tickets.ministry_id` is set at create (future transfer updates this).

If `telegram_chat_id` is NULL → post to `TELEGRAM_CHAT_ID` from env (dev/fallback). Set real chat ids in DB when ministries create groups:

```sql
UPDATE sg_ministries SET telegram_chat_id = -100… WHERE slug = 'education';
```

## Ticket fields

- `category`, `ministry_id`, `body`, `status`, `author_telegram_id`, `assignee_telegram_id`
- `ticket_telegram_messages` for delivery threading

## Config

```
TELEGRAM_CHAT_ID=<fallback chat id>
```

## Website

`/sgotinish` is a guide + deeplink CTA, plus public aggregate stats from `GET /api/sgotinish/stats` (totals, answered %, closed, this week, top ministries — no bodies or Telegram IDs).

## Migrations

Revision `0da5c3c1dd0a` (from `ac5e84afee18`): bot-first tickets, `sg_ministries` seed, new categories. Clears legacy tickets when swapping the category enum.
