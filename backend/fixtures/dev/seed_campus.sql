-- Realistic Campus Current and SGotinish data for local dev.
--
-- Without this, a fresh database has one event, one community and two users, so
-- most screens render an empty state and the ones that do not are exercised
-- against a single row. Every filter, every grouping and every permission
-- branch then looks like it works because there is nothing for it to get wrong.
--
-- What this covers, and why each case is here:
--
--   * events          — past, in progress, today and weeks out, so the time
--                       filters and the "Happening now" badge have something to
--                       separate; open and registration policies; a featured tag.
--   * communities     — every type and several categories, one verified, one
--                       headed by a non-admin so `can_edit` differs by viewer.
--   * opportunities   — expired and open, year-round (`deadline IS NULL`), one
--                       restricted by major, and eligibilities covering the
--                       three level shapes: specific years, a whole level, PhD.
--   * SG membership   — Heads, Executives and Members across regular and special
--                       departments, so the roster grouping is non-trivial and
--                       the capo permission rules can actually be violated.
--   * tickets         — one per status, one anonymous with a known key, and one
--                       with a delegated access list.
--
-- Announcements need no seeding of their own: `/announcements/bundle` is built
-- from upcoming events and recruiting communities, both of which are below.
--
-- Run against the local stack:
--   docker compose exec -T postgres psql -U postgres -d postgres \
--     < backend/fixtures/dev/seed_campus.sql
--
-- Then restart the API — Meilisearch indexes from the database at startup, so
-- anything inserted afterwards is invisible to search until it does:
--   docker compose restart fastapi
--
-- Signing in as each of these people (MOCK_KEYCLOAK=true):
--   http://localhost/api/login?mock_user=alice     admin
--   http://localhost/api/login?mock_user=bob       ordinary student
--   http://localhost/api/login?mock_user=charlie   Head (boss)
--   http://localhost/api/login?mock_user=dana      Executive (capo)
--   http://localhost/api/login?mock_user=erik      Member (soldier)
--
-- Re-runnable. Rows are matched on the natural key a person would recognise —
-- a community's name, an event's name, a ticket's title — because none of these
-- tables has a unique constraint to hang `ON CONFLICT` on. A bare
-- `ON CONFLICT DO NOTHING` looks like it deduplicates and does nothing at all
-- without a constraint to conflict against; the second run of an earlier draft
-- of this file produced a clean duplicate of every event, ticket, community and
-- opportunity. Nothing here deletes anything you created by hand.

BEGIN;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
-- alice and bob already exist from the mock provider; charlie is defined there
-- too but only appears once he has signed in. Inserting all five means the
-- roster is populated before anyone logs in, and the FK targets for the
-- communities and tickets below exist.

INSERT INTO users (sub, email, role, scope, name, surname, picture, created_at, updated_at) VALUES
  ('mock-sub-alice',   'alice@example.com',   'admin',   'allowed', 'Alice',   'Anderson', 'https://i.pravatar.cc/150?img=3', now(), now()),
  ('mock-sub-bob',     'bob@example.com',     'default', 'allowed', 'Bob',     'Brown',    'https://i.pravatar.cc/150?img=4', now(), now()),
  ('mock-sub-charlie', 'charlie@example.com', 'boss',    'allowed', 'Charlie', 'Clark',    'https://i.pravatar.cc/150?img=5', now(), now()),
  ('mock-sub-dana',    'dana@example.com',    'capo',    'allowed', 'Dana',    'Dosanova', 'https://i.pravatar.cc/150?img=6', now(), now()),
  ('mock-sub-erik',    'erik@example.com',    'soldier', 'allowed', 'Erik',    'Ermekov',  'https://i.pravatar.cc/150?img=7', now(), now()),
  ('mock-sub-fatima',  'fatima@example.com',  'soldier', 'allowed', 'Fatima',  'Fazylova', 'https://i.pravatar.cc/150?img=8', now(), now()),
  ('mock-sub-gulnar',  'gulnar@example.com',  'capo',    'allowed', 'Gulnar',  'Galieva',  'https://i.pravatar.cc/150?img=9', now(), now()),
  ('mock-sub-hassan',  'hassan@example.com',  'default', 'allowed', 'Hassan',  'Hakim',    'https://i.pravatar.cc/150?img=10', now(), now())
ON CONFLICT (sub) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  surname = EXCLUDED.surname,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
-- Id 9 is the root Student Government department. The backend hardcodes it —
-- `DelegationPolicy.check_department_deletable` refuses to delete id 9 by
-- number — so a local database has to reproduce that id for the protected-row
-- behaviour to be testable at all. Explicit ids here, not a sequence.

INSERT INTO departments (id, name, is_special) VALUES
  (9,  'Student Government',        false),
  (10, 'Ministry of Academics',     false),
  (11, 'Ministry of Sport',         false),
  (12, 'Ministry of Media',         false),
  (13, 'Ethics Commission',         true),
  (14, 'Election Committee',        true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_special = EXCLUDED.is_special;

-- Keep the sequence ahead of the explicit ids, or the first department created
-- through the UI collides with one of them.
SELECT setval(
  pg_get_serial_sequence('departments', 'id'),
  GREATEST((SELECT MAX(id) FROM departments), 1)
);

UPDATE users SET department_id = 9,  sg_assigned_at = now() - interval '200 days' WHERE sub = 'mock-sub-charlie';
UPDATE users SET department_id = 10, sg_assigned_at = now() - interval '150 days', sg_assigned_by_sub = 'mock-sub-charlie' WHERE sub = 'mock-sub-dana';
UPDATE users SET department_id = 10, sg_assigned_at = now() - interval '100 days', sg_assigned_by_sub = 'mock-sub-dana'    WHERE sub = 'mock-sub-erik';
-- Fatima sits in a different department from Dana on purpose: a capo must not
-- be able to remove or delegate to her, and that is only visible with someone
-- outside their own department in the roster.
UPDATE users SET department_id = 11, sg_assigned_at = now() - interval '90 days',  sg_assigned_by_sub = 'mock-sub-charlie' WHERE sub = 'mock-sub-fatima';
UPDATE users SET department_id = 13, sg_assigned_at = now() - interval '80 days',  sg_assigned_by_sub = 'mock-sub-charlie' WHERE sub = 'mock-sub-gulnar';

-- ---------------------------------------------------------------------------
-- Communities
-- ---------------------------------------------------------------------------

INSERT INTO communities (name, type, category, email, verified, description, established, head, telegram_url, instagram_url, created_at, updated_at)
SELECT * FROM (VALUES
  ('NU Fencing Club', 'club', 'sports', 'fencing@nu.edu.kz', true,
   E'Foil, épée and sabre, three evenings a week in the Sports Complex.\n\nBeginners welcome — we lend kit for the first term. **No experience needed.**',
   '2019-09-01', 'mock-sub-bob', 'https://t.me/nufencing', 'https://instagram.com/nufencing', now(), now()),

  ('Debate Society', 'club', 'academic', 'debate@nu.edu.kz', true,
   'British Parliamentary format, weekly rounds, and the training squad for regional tournaments.',
   '2015-02-15', 'mock-sub-charlie', 'https://t.me/nudebate', NULL, now(), now()),

  ('Robotics and Mechatronics Association', 'organization', 'professional', 'rma@nu.edu.kz', false,
   'Builds the university competition robots. Recruiting mechanical, electronics and software people every September.',
   '2021-09-10', 'mock-sub-dana', 'https://t.me/nurobotics', 'https://instagram.com/nurobotics', now(), now()),

  ('Student Theatre', 'club', 'art', NULL, false,
   'Two productions a year, in English and Kazakh. No audition required to join the crew.',
   '2017-10-05', 'mock-sub-erik', NULL, 'https://instagram.com/nutheatre', now(), now()),

  ('Office of Student Affairs', 'university', 'social', 'osa@nu.edu.kz', true,
   'Official university office. Runs orientation, student support and the campus events calendar.',
   '2010-01-01', 'mock-sub-alice', NULL, NULL, now(), now()),

  ('Kazakh Culture Club', 'club', 'cultural', 'kcc@nu.edu.kz', false,
   'Language evenings, Nauryz, and dombra lessons for anyone who wants them.',
   '2018-03-21', 'mock-sub-fatima', 'https://t.me/nukcc', NULL, now(), now()),

  ('Hiking and Outdoors', 'club', 'recreational', NULL, false,
   'Weekend trips to Burabay and the Ile-Alatau. Transport shared, no membership fee.',
   '2022-04-12', 'mock-sub-gulnar', 'https://t.me/nuhiking', NULL, now(), now())
) AS seed(name, type, category, email, verified, description, established, head, telegram_url, instagram_url, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM communities c WHERE c.name = seed.name);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
-- Times are relative to now() so the time filters keep working next month —
-- fixed dates in a seed script quietly become "all past" and the upcoming list
-- reads as empty.

INSERT INTO events (creator_sub, policy, registration_link, name, place, start_datetime, end_datetime, description, type, status, tag, created_at, updated_at)
SELECT * FROM (VALUES
  ('mock-sub-charlie', 'open', NULL,
   'Open Mic Night', 'Block 8, Atrium',
   now() + interval '2 hours', now() + interval '5 hours',
   E'Bring an instrument, a poem or nothing at all.\n\n- Sign-up sheet at the door\n- Free tea',
   'art', 'approved', 'regular', now(), now()),

  ('mock-sub-bob', 'registration', 'https://forms.gle/example-fencing',
   'Fencing Taster Session', 'Sports Complex, Hall 2',
   now() + interval '3 days', now() + interval '3 days 2 hours',
   'Kit provided. Wear trainers and something you can move in. Places are limited to 24.',
   'sports', 'approved', 'regular', now(), now()),

  ('mock-sub-alice', 'open', NULL,
   'Career Fair 2026', 'Block 7, Main Hall',
   now() + interval '11 days', now() + interval '11 days 8 hours',
   E'Forty employers across engineering, data and life sciences.\n\n## What to bring\n\n1. Printed CV\n2. Student ID',
   'recruitment', 'approved', 'featured', now(), now()),

  ('mock-sub-dana', 'registration', 'https://forms.gle/example-hackathon',
   'NU Hackathon: 36 Hours', 'SCAI, Floor 3',
   now() + interval '25 days', now() + interval '26 days 12 hours',
   'Teams of up to four. Hardware track and a software track, with mentors from the Robotics Association.',
   'academic', 'approved', 'promotional', now(), now()),

  ('mock-sub-erik', 'open', NULL,
   'Winter Charity Bazaar', 'Block 1, Foyer',
   now() + interval '40 days', now() + interval '40 days 6 hours',
   'All proceeds to the Astana children''s hospital. Stalls are free for student societies.',
   'social', 'approved', 'charity', now(), now()),

  -- Already finished: the detail page should show "Finished" and hide the
  -- registration button even though a link is set.
  ('mock-sub-charlie', 'registration', 'https://forms.gle/example-past',
   'Autumn Debate Open', 'Block 6, Room 6.201',
   now() - interval '14 days', now() - interval '14 days' + interval '9 hours',
   'Eight rounds, British Parliamentary. Results are on the Debate Society channel.',
   'academic', 'approved', 'regular', now(), now()),

  ('mock-sub-gulnar', 'open', NULL,
   'Sunrise Hike: Burabay', 'Meet at Block 22 car park',
   now() + interval '6 days', now() + interval '6 days 14 hours',
   'Leaving at 05:00. Bring water, layers and boots — this is not a stroll.',
   'recreational', 'approved', 'regular', now(), now()),

  -- Not approved: must not appear in the student-facing list at all.
  ('mock-sub-hassan', 'open', NULL,
   'Unapproved Test Event', 'Nowhere',
   now() + interval '9 days', now() + interval '9 days 1 hour',
   'Exists so the status filter has something it is supposed to be hiding.',
   'social', 'pending', 'regular', now(), now())
) AS seed(creator_sub, policy, registration_link, name, place, start_datetime, end_datetime, description, type, status, tag, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.name = seed.name);

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
-- The enum labels here are the Python member *names* (RESEARCH, GRM), not the
-- values the API speaks (research, GrM) — SQLAlchemy stores names by default,
-- and using the API spelling fails with an invalid-enum error.

INSERT INTO opportunities (name, description, deadline, host, type, link, location, funding, created_at, updated_at)
SELECT * FROM (VALUES
  ('Nazarbayev University Research Assistantship',
   E'Paid research assistant positions across all schools for the spring semester.\n\nSupervisors post projects in February; applications go through your school office.',
   CURRENT_DATE + 21, 'NU Office of the Provost', 'RESEARCH',
   'https://nu.edu.kz/research', 'Astana', 'Stipend, 120,000 KZT/month', now(), now()),

  ('DAAD Summer School in Germany',
   'Four weeks at a German university, language course included. Covers travel, accommodation and a monthly allowance.',
   CURRENT_DATE + 45, 'DAAD', 'SUMMER_SCHOOL',
   'https://daad.de', 'Germany', 'Fully funded', now(), now()),

  ('Google Summer of Code',
   'Work on an open-source project with a mentoring organisation over the summer. Open to any student who can write code.',
   CURRENT_DATE + 60, 'Google', 'INTERNSHIP',
   'https://summerofcode.withgoogle.com', 'Remote', 'Stipend by country tier', now(), now()),

  -- Year-round: `deadline IS NULL` is the shape the "year-round" toggle
  -- produces, and the card must not render a closing date for it.
  ('NU Alumni Mentorship Programme',
   'Matched with an alumnus in your field for a semester. Applications are read as they arrive.',
   NULL, 'NU Alumni Association', 'FORUM',
   'https://nu.edu.kz/alumni', 'Astana / Remote', NULL, now(), now()),

  -- Already closed: `hide_expired=true` is the default on the list, so this one
  -- proves the filter is doing something.
  ('Bolashak Scholarship — 2025 intake',
   'Graduate study abroad, fully funded, with a return-service commitment.',
   CURRENT_DATE - 30, 'Centre for International Programmes', 'SCHOLARSHIP',
   'https://bolashak.gov.kz', 'Abroad', 'Fully funded', now(), now()),

  ('Astana Hub Startup Grant',
   'Seed funding for student teams with a working prototype. Two rounds a year.',
   CURRENT_DATE + 90, 'Astana Hub', 'GRANT',
   'https://astanahub.com', 'Astana', 'Up to 20,000 USD', now(), now())
) AS seed(name, description, deadline, host, type, link, location, funding, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.name = seed.name);

-- Eligibility, covering the three shapes the form can produce.
INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT o.id, level, year FROM opportunities o
CROSS JOIN LATERAL (VALUES ('UG'::education_level, 3), ('UG', 4), ('GRM', NULL))
  AS e(level, year)
WHERE o.name = 'Nazarbayev University Research Assistantship'
ON CONFLICT DO NOTHING;

-- A whole level with no years: one row with year NULL, which is what "the
-- entire level is eligible" means. Zero rows would mean nobody is.
INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT id, 'UG', NULL FROM opportunities WHERE name = 'DAAD Summer School in Germany'
ON CONFLICT DO NOTHING;

INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT o.id, level, year FROM opportunities o
CROSS JOIN LATERAL (VALUES ('UG'::education_level, 2), ('UG', 3), ('UG', 4), ('GRM', 1))
  AS e(level, year)
WHERE o.name = 'Google Summer of Code'
ON CONFLICT DO NOTHING;

-- PhD always carries year NULL — there is no year to pick.
INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT o.id, level, NULL FROM opportunities o
CROSS JOIN LATERAL (VALUES ('GRM'::education_level), ('PHD')) AS e(level)
WHERE o.name = 'NU Alumni Mentorship Programme'
ON CONFLICT DO NOTHING;

INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT id, 'PHD', NULL FROM opportunities WHERE name = 'Bolashak Scholarship — 2025 intake'
ON CONFLICT DO NOTHING;

INSERT INTO opportunity_eligibility (opportunity_id, education_level, year)
SELECT id, 'UG', NULL FROM opportunities WHERE name = 'Astana Hub Startup Grant'
ON CONFLICT DO NOTHING;

-- Majors: one restricted opportunity, one left open to everybody. As with the
-- types above, these are Python member names — `COMPUTER_SCIENCE`, not the
-- "Computer Science" the API sends.
INSERT INTO opportunity_majors (opportunity_id, major)
SELECT o.id, major FROM opportunities o
CROSS JOIN LATERAL (VALUES
  ('COMPUTER_SCIENCE'::opportunity_major),
  ('DATA_SCIENCE'),
  ('ELECTRICAL_AND_COMPUTER_ENGINEERING'),
  ('ROBOTICS_AND_MECHATRONICS_ENGINEERING')
) AS m(major)
WHERE o.name = 'Google Summer of Code'
ON CONFLICT DO NOTHING;

INSERT INTO opportunity_majors (opportunity_id, major)
SELECT o.id, major FROM opportunities o
CROSS JOIN LATERAL (VALUES ('PHYSICS'::opportunity_major), ('CHEMISTRY'), ('BIOLOGICAL_SCIENCES'))
  AS m(major)
WHERE o.name = 'Nazarbayev University Research Assistantship'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SGotinish
-- ---------------------------------------------------------------------------

INSERT INTO tickets (author_sub, category, title, body, status, is_anonymous, owner_hash, created_at, updated_at)
SELECT * FROM (VALUES
  ('mock-sub-bob', 'academic',
   'Library closes too early during finals',
   'The 24-hour reading room stops being 24-hour in week 14, which is exactly when it is needed. Could the hours be extended through the exam period?',
   'open', false, NULL, now() - interval '3 days', now() - interval '3 days'),

  ('mock-sub-hassan', 'technical',
   'Wi-fi drops in Block 22 every evening',
   'Between roughly 21:00 and midnight the connection in the west wing becomes unusable. It has been like this since September.',
   'in_progress', false, NULL, now() - interval '9 days', now() - interval '2 days'),

  ('mock-sub-bob', 'suggestion',
   'Add a bike rack outside Block 7',
   'There is nowhere to lock a bike near the main entrance, so people chain them to the railings.',
   'resolved', false, NULL, now() - interval '30 days', now() - interval '20 days'),

  ('mock-sub-hassan', 'administrative',
   'Transcript request took five weeks',
   'Requested on 12 March, received on 16 April, with no way to check progress in between.',
   'closed', false, NULL, now() - interval '60 days', now() - interval '35 days'),

  -- Anonymous. `author_sub` is NULL by design: the owner hash is the only thing
  -- that identifies the author, and the key that produces it is
  --   demo-anonymous-warpkey-for-local-dev
  -- so this ticket is reachable at
  --   http://localhost:6767/t#key=demo-anonymous-warpkey-for-local-dev
  -- Do not put a real key in a fixture; this one exists to be public.
  (NULL, 'complaint',
   'Grading in a core course feels inconsistent',
   'Two students submitted near-identical work and received grades a full letter apart. Raising it with the instructor did not help.',
   'in_progress', true, 'b7e8ba0e5b9ebf78ea3c78426a9b419a2e42e00698f4ee8b364cf27bd87dd07e',
   now() - interval '5 days', now() - interval '1 day')
) AS seed(author_sub, category, title, body, status, is_anonymous, owner_hash, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.title = seed.title);

INSERT INTO conversations (ticket_id, sg_member_sub, status, created_at)
SELECT t.id, 'mock-sub-dana', 'active', t.created_at + interval '4 hours'
FROM tickets t
WHERE t.title = 'Wi-fi drops in Block 22 every evening'
  AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.ticket_id = t.id);

INSERT INTO conversations (ticket_id, sg_member_sub, status, created_at)
SELECT t.id, 'mock-sub-charlie', 'active', t.created_at + interval '2 hours'
FROM tickets t
WHERE t.title = 'Grading in a core course feels inconsistent'
  AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.ticket_id = t.id);

INSERT INTO messages (conversation_id, sender_sub, body, is_from_sg_member, sent_at)
SELECT c.id, 'mock-sub-dana',
       'Thanks for reporting this — we have passed it to IT and asked for the access point logs for the west wing.',
       true, c.created_at + interval '20 minutes'
FROM conversations c JOIN tickets t ON t.id = c.ticket_id
WHERE t.title = 'Wi-fi drops in Block 22 every evening'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.body = 'Thanks for reporting this — we have passed it to IT and asked for the access point logs for the west wing.'
  );

INSERT INTO messages (conversation_id, sender_sub, body, is_from_sg_member, sent_at)
SELECT c.id, 'mock-sub-hassan',
       'It happened again last night, around 22:30. Two other people on my floor see the same thing.',
       false, c.created_at + interval '1 day'
FROM conversations c JOIN tickets t ON t.id = c.ticket_id
WHERE t.title = 'Wi-fi drops in Block 22 every evening'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.body = 'It happened again last night, around 22:30. Two other people on my floor see the same thing.'
  );

-- The anonymous author's own message carries no sender_sub. That is the whole
-- point of the anonymous flow, and it is why the conversation view has to cope
-- with a message that has no sender.
INSERT INTO messages (conversation_id, sender_sub, body, is_from_sg_member, sent_at)
SELECT c.id, NULL,
       'I would rather not name the course here. Is there a way to raise it without the instructor knowing who asked?',
       false, c.created_at + interval '10 minutes'
FROM conversations c JOIN tickets t ON t.id = c.ticket_id
WHERE t.title = 'Grading in a core course feels inconsistent'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.body = 'I would rather not name the course here. Is there a way to raise it without the instructor knowing who asked?'
  );

INSERT INTO messages (conversation_id, sender_sub, body, is_from_sg_member, sent_at)
SELECT c.id, 'mock-sub-charlie',
       'Yes. We can raise it through the Ethics Commission without attributing it to you. Nothing you have written here is linked to your account.',
       true, c.created_at + interval '3 hours'
FROM conversations c JOIN tickets t ON t.id = c.ticket_id
WHERE t.title = 'Grading in a core course feels inconsistent'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.body = 'Yes. We can raise it through the Ethics Commission without attributing it to you. Nothing you have written here is linked to your account.'
  );

-- Every Head gets DELEGATE on every ticket, which is what
-- `TicketService.create_ticket` does for real tickets: it grants access to all
-- bosses and notifies them. Inserting rows directly skips that, and without
-- these the SG inbox is empty for a Head — the list is filtered to tickets you
-- authored or have explicit access to, so a boss with no access rows sees
-- nothing and it looks like the inbox is broken.
INSERT INTO ticket_access (ticket_id, user_sub, permission, granted_by_sub, granted_at)
SELECT t.id, u.sub, 'DELEGATE', NULL, t.created_at
FROM tickets t CROSS JOIN users u
WHERE u.role = 'boss'
ON CONFLICT DO NOTHING;

-- A delegated access list, so the ticket page has something to show and the
-- "who can see this" question has a non-empty answer. Enum labels again are
-- Python member names: VIEW / ASSIGN / DELEGATE.
INSERT INTO ticket_access (ticket_id, user_sub, permission, granted_by_sub, granted_at)
SELECT t.id, 'mock-sub-dana', 'ASSIGN', 'mock-sub-charlie', now() - interval '4 days'
FROM tickets t WHERE t.title = 'Grading in a core course feels inconsistent'
ON CONFLICT DO NOTHING;

INSERT INTO ticket_access (ticket_id, user_sub, permission, granted_by_sub, granted_at)
SELECT t.id, 'mock-sub-erik', 'VIEW', 'mock-sub-dana', now() - interval '3 days'
FROM tickets t WHERE t.title = 'Grading in a core course feels inconsistent'
ON CONFLICT DO NOTHING;

INSERT INTO ticket_access (ticket_id, user_sub, permission, granted_by_sub, granted_at)
SELECT t.id, 'mock-sub-dana', 'DELEGATE', 'mock-sub-charlie', now() - interval '8 days'
FROM tickets t WHERE t.title = 'Wi-fi drops in Block 22 every evening'
ON CONFLICT DO NOTHING;

COMMIT;
