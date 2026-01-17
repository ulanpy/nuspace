# SGotinish module changes

This note documents recent changes in `backend/modules/sgotinish` and related
database models that affect tickets, messages, and anonymity.

## Ticket anonymity (WarpKey / owner_hash)

- Tickets can be accessed via a client-generated secret key (WarpKey).
- The client generates `WarpKey`, computes `owner_hash = SHA256(WarpKey)`,
  and sends only the hash to the backend.
- For anonymous tickets:
  - `tickets.author_sub` is set to `NULL`.
  - `tickets.owner_hash` stores the 64-char hex digest.

### New/updated ticket endpoints

- `POST /tickets`
  - Accepts `owner_hash` when `is_anonymous=true`.
  - Enforces `owner_hash` validation in `TicketCreateDTO`.
- `POST /tickets/by-owner-hash`
  - Fetch a ticket by hash (for `/t?key=...` flow).

## Message anonymity

When an anonymous ticket author posts a message:

- `messages.sender_sub` is stored as `NULL`.
- Read status is stored in a new table keyed by `owner_hash`, not `user_sub`.

### New table

- `message_read_status_anon`
  - `message_id`
  - `owner_hash`
  - `read_at`

### Message endpoints (updated behavior)

The following endpoints accept `owner_hash` in query string:

- `POST /messages`
- `GET /messages`
- `GET /messages/{message_id}`
- `POST /messages/{message_id}/read`

If `owner_hash` matches the ticket hash:

- Read/write access is permitted for the anonymous owner.
- Read receipts are stored in `message_read_status_anon`.

## Unread counts for anonymous tickets

There is a separate unread count path for anonymous owners:

- `get_unread_messages_count_for_tickets_by_owner_hash(...)`
  - Counts only SG member messages as unread.
  - Uses `message_read_status_anon` to track reads.

## Notifications

For anonymous ticket authors, message notifications to SG members no longer
require a `sender` user object. The recipient is still the assigned SG member.

## Related model changes

In `backend/core/database/models/sgotinish.py`:

- `Ticket.owner_hash` (string, nullable, indexed)
- `Message.read_statuses_anon` relationship
- `MessageReadStatusAnon` model

## Migration notes

Add migrations for:

- `tickets.owner_hash`
- `message_read_status_anon` table

No automatic migrations are created here; generate them in your own workflow.
