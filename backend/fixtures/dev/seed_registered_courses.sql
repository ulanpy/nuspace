-- Synthetic registered courses for local dev.
--
-- Real ones are pulled from the registrar per student, which needs credentials
-- no local environment has — so without this every Courses screen renders its
-- empty state and the live GPA calculator can't be exercised at all.
--
-- Shaped like week 8 of a term, deliberately covering the cases the GPA
-- arithmetic distinguishes: a course doing well with most of the term still
-- ahead, one where banked and so-far diverge hard, one with nothing graded yet
-- (must be skipped, not counted as zero), one fully graded, and one with no
-- items at all.
--
-- Run against the local stack:
--   docker compose exec -T postgres psql -U postgres -d postgres \
--     < backend/fixtures/dev/seed_registered_courses.sql
--
-- Assumes the mock user `mock-sub-alice` exists (MOCK_KEYCLOAK=true, then
-- hit /api/login?mock_user=1).
BEGIN;

INSERT INTO courses (registrar_id, course_code, level, school, title, credits, term, created_at, updated_at) VALUES
  (100151, 'CSCI 151', 'UG', 'SCAI', 'Programming for Scientists and Engineers', 4, 'Fall 2026', now(), now()),
  (100231, 'CSCI 231', 'UG', 'SCAI', 'Computer Systems and Organization',        3, 'Fall 2026', now(), now()),
  (100241, 'MATH 241', 'UG', 'SSH',  'Linear Algebra with Applications',         3, 'Fall 2026', now(), now()),
  (100161, 'PHYS 161', 'UG', 'SSH',  'Physics I',                                4, 'Fall 2026', now(), now()),
  (100101, 'WCS 101',  'UG', 'SSH',  'Writing and Communication I',              3, 'Fall 2026', now(), now());

INSERT INTO student_courses (student_sub, course_id, created_at, updated_at)
SELECT 'mock-sub-alice', id, now(), now() FROM courses;

-- CSCI 151: doing well, most of the term still ahead.
INSERT INTO course_items (student_course_id, item_name, total_weight_pct, max_score, obtained_score, created_at, updated_at)
SELECT sc.id, v.name, v.w, v.max, v.got, now(), now()
FROM student_courses sc
JOIN courses c ON c.id = sc.course_id AND c.course_code = 'CSCI 151'
CROSS JOIN (VALUES
  ('Lab 1',      5.0,  100.0, 98.0),
  ('Lab 2',      5.0,  100.0, 92.0),
  ('Lab 3',      5.0,  100.0, 88.0),
  ('Homework 1', 10.0, 50.0,  47.5),
  ('Homework 2', 10.0, 50.0,  41.0),
  ('Midterm',    25.0, 100.0, 84.0),
  ('Project',    15.0, 100.0, NULL),
  ('Final',      25.0, 100.0, NULL)
) AS v(name, w, max, got);

-- CSCI 231: a rough midterm — the case where "banked" and "so far" diverge.
INSERT INTO course_items (student_course_id, item_name, total_weight_pct, max_score, obtained_score, created_at, updated_at)
SELECT sc.id, v.name, v.w, v.max, v.got, now(), now()
FROM student_courses sc
JOIN courses c ON c.id = sc.course_id AND c.course_code = 'CSCI 231'
CROSS JOIN (VALUES
  ('Quiz 1',   10.0, 20.0,  13.0),
  ('Quiz 2',   10.0, 20.0,  16.0),
  ('Midterm',  30.0, 100.0, 61.0),
  ('Lab work', 20.0, 100.0, NULL),
  ('Final',    30.0, 100.0, NULL)
) AS v(name, w, max, got);

-- MATH 241: nothing graded yet — must be skipped by the GPA, not read as 0.
INSERT INTO course_items (student_course_id, item_name, total_weight_pct, max_score, obtained_score, created_at, updated_at)
SELECT sc.id, v.name, v.w, v.max, v.got, now(), now()
FROM student_courses sc
JOIN courses c ON c.id = sc.course_id AND c.course_code = 'MATH 241'
CROSS JOIN (VALUES
  ('Midterm 1', 25.0, 100.0, NULL::numeric),
  ('Midterm 2', 25.0, 100.0, NULL),
  ('Final',     50.0, 100.0, NULL)
) AS v(name, w, max, got);

-- PHYS 161: borderline, and weights sum to 100 with everything graded.
INSERT INTO course_items (student_course_id, item_name, total_weight_pct, max_score, obtained_score, created_at, updated_at)
SELECT sc.id, v.name, v.w, v.max, v.got, now(), now()
FROM student_courses sc
JOIN courses c ON c.id = sc.course_id AND c.course_code = 'PHYS 161'
CROSS JOIN (VALUES
  ('Problem set 1', 20.0, 40.0,  31.0),
  ('Problem set 2', 20.0, 40.0,  29.0),
  ('Midterm',       30.0, 100.0, 74.0),
  ('Final',         30.0, 100.0, 71.0)
) AS v(name, w, max, got);

-- WCS 101: no items at all — the empty-course case.

COMMIT;
