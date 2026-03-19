-- ================================================================
-- SCRUM APP – DEMO SEED DATA
-- Password for all users: testpassword123!
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. AUTH USERS
-- ================================================================

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'authenticated', 'authenticated',
   'admin@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '30 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'authenticated', 'authenticated',
   'manca@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '25 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'authenticated', 'authenticated',
   'grega@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '25 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'authenticated', 'authenticated',
   'vito@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '25 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'authenticated', 'authenticated',
   'anze@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '25 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'authenticated', 'authenticated',
   'marko@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '25 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'authenticated', 'authenticated',
   'random@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '10 days', now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  -- Integration test user – required by src/tests/integration/*
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'authenticated', 'authenticated',
   'testuser01@scrumapp.si', crypt('testpassword123!', gen_salt('bf', 10)),
   now(), now() - interval '1 day', now(),
   '{"provider":"email","providers":["email"]}', '{}');

-- Auth identities (required for email/password login to work)
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('admin@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"admin@scrumapp.si"}', 'email', now(), now(), now()),
  ('manca@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12","email":"manca@scrumapp.si"}', 'email', now(), now(), now()),
  ('grega@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13","email":"grega@scrumapp.si"}', 'email', now(), now(), now()),
  ('vito@scrumapp.si',  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14","email":"vito@scrumapp.si"}',  'email', now(), now(), now()),
  ('anze@scrumapp.si',  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15","email":"anze@scrumapp.si"}',  'email', now(), now(), now()),
  ('marko@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16","email":"marko@scrumapp.si"}', 'email', now(), now(), now()),
  ('random@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17","email":"random@scrumapp.si"}', 'email', now(), now(), now()),
  ('testuser01@scrumapp.si', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18',
   '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18","email":"testuser01@scrumapp.si"}', 'email', now(), now(), now());

-- ================================================================
-- 2. PUBLIC USERS
-- ================================================================

INSERT INTO public."Users" (id, username, name, surname, email, "lastLogin", "currentLogin") VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin',         'Admin', 'Admin',   'admin@scrumapp.si', now() - interval '1 day',      now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manca.drascek', 'Manca', 'Drašček', 'manca@scrumapp.si', now() - interval '2 hours',    now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'grega.radez',   'Grega', 'Radež',   'grega@scrumapp.si', now() - interval '3 hours',    now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'vito.verdnik',  'Vito',  'Verdnik', 'vito@scrumapp.si',  now() - interval '1 hour',     now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'anze.judez',    'Anže',  'Judež',   'anze@scrumapp.si',  now() - interval '30 minutes', now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'marko.pozenel', 'Marko', 'Poženel', 'marko@scrumapp.si', now() - interval '4 hours',    now()),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'random',        'Random',    'Random', 'random@scrumapp.si',    now() - interval '5 days', now()),
  -- Integration test user – do not assign to any project
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'testuser01',    'Test',      'User01', 'testuser01@scrumapp.si', now() - interval '1 day',  now());

-- ================================================================
-- 3. SYSTEM ROLES
-- ================================================================

-- Admin → Admin
INSERT INTO public."UserRoles" ("FK_userId", "FK_roleId")
  SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id FROM public."Roles" WHERE name = 'Admin';

-- Everyone else → User
INSERT INTO public."UserRoles" ("FK_userId", "FK_roleId")
SELECT uid::uuid, r.id
FROM (VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18')   -- testuser01
) AS u(uid)
CROSS JOIN public."Roles" r WHERE r.name = 'User';

-- ================================================================
-- 4. PROJECT
-- ================================================================

INSERT INTO public."Projects" (id, name, description) OVERRIDING SYSTEM VALUE VALUES
  (1, 'E-učilnica',
   'Spletna platforma za upravljanje učnih tečajev, oddajo nalog in komunikacijo med učitelji in študenti.');

-- ================================================================
-- 5. PROJECT MEMBERS & ROLES
-- ================================================================

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
  SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 1, id FROM public."ProjectRoles" WHERE "projectRole" = 'Product Owner';

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
  SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 1, id FROM public."ProjectRoles" WHERE "projectRole" = 'Scrum Master';

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
SELECT uid::uuid, 1, r.id
FROM (VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15')
) AS u(uid)
CROSS JOIN public."ProjectRoles" r WHERE r."projectRole" = 'Developer';

-- ================================================================
-- 6. SPRINTS
-- ================================================================
--   Sprint 1 – past (completed, stories realized)
--   Sprint 2 – active (today = 2026-03-19, within Mar 1–31)
--   Sprint 3 – future (not yet started, editable/deletable for demo #7)

INSERT INTO public."Sprints" (id, "startingDate", "endingDate", "startingSpeed", "FK_projectId")
OVERRIDING SYSTEM VALUE VALUES
  (1, '2026-01-06 00:00:00', '2026-01-31 23:59:59', 40, 1),
  (2, '2026-03-01 00:00:00', '2026-03-31 23:59:59', 30, 1),
  (3, '2026-04-06 00:00:00', '2026-04-30 23:59:59', 35, 1);

-- ================================================================
-- 7. USER STORIES
-- ================================================================
-- Product Backlog categories (#27):
--   Stories 1–2  → REALIZED   (accepted=true, realized=true, in past sprint)
--   Stories 3–5  → IN ACTIVE SPRINT (realized=false, assigned to sprint 2)
--   Story 6      → UNASSIGNED with time complexity  (ready for assignment/poker)
--   Stories 7–8  → UNASSIGNED without time complexity (needs estimation – #11, #12)

INSERT INTO public."UserStories" (
  id, "FK_projectId", name, description, "businessValue",
  "FK_priorityId", accepted, realized, "timeComplexity"
) OVERRIDING SYSTEM VALUE
SELECT v.id, 1, v.name, v.descr, v.bv, p.id, v.acc, v.real, v.tc
FROM (VALUES
  (1, 'Prijava v sistem',
   'Uporabnik se prijavi z uporabniškim imenom in geslom. Sistem zabeleži čas prijave.',
   100, 'Must have',             true,  true,  8.0),
  (2, 'Registracija uporabnika',
   'Administrator doda novega uporabnika z vsemi zahtevanimi podatki in vlogami.',
   90,  'Must have',             true,  true,  5.0),
  (3, 'Upravljanje tečajev',
   'Učitelj ustvari, ureja in briše tečaje z opisom in gradivi.',
   80,  'Must have',             false, false, 8.0),
  (4, 'Oddaja nalog',
   'Študent odda nalogo za posamezen tečaj pred rokom.',
   70,  'Should have',           false, false, 5.0),
  (5, 'Forum za razpravo',
   'Člani tečaja razpravljajo v nitih na forumu tečaja.',
   60,  'Could have',            false, false, 13.0),
  (6, 'Sistem obveščanja',
   'Uporabniki prejmejo e-mail ob novih objavah in oddajah nalog.',
   50,  'Should have',           false, false, 5.0),
  (7, 'Integracija z Google Calendar',
   'Roki za naloge se samodejno sinhronizirajo z Google Calendarjem.',
   40,  'Could have',            false, false, NULL),
  (8, 'Mobilna aplikacija',
   'Aplikacija je optimizirana za uporabo na mobilnih napravah.',
   20,  'Won''t have this time', false, false, NULL)
) AS v(id, name, descr, bv, priority_name, acc, real, tc)
JOIN public."Priorities" p ON p.priority = v.priority_name;

-- ================================================================
-- 8. ACCEPTANCE TESTS
-- ================================================================

INSERT INTO public."AcceptanceTests" (id, description, "FK_userStoryId")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Prijava z veljavnim uporabniškim imenom in geslom uspe.',              1),
  (2, 'Prijava z napačnim geslom vrne jasno sporočilo o napaki.',             1),
  (3, 'Sistem zabeleži datum in čas zadnje prijave.',                         1),
  (4, 'Nov uporabnik se uspešno ustvari z vsemi obveznimi polji.',            2),
  (5, 'Sistem prepreči podvajanje uporabniškega imena.',                      2),
  (6, 'Tečaj se ustvari in je prikazan na seznamu tečajev učitelja.',         3),
  (7, 'Naloga se odda in je vidna v pregledu oddaj za učitelja.',             4),
  (8, 'Obvestilo prispe v roku ene minute od sprožilnega dogodka.',           6);

-- ================================================================
-- 9. SPRINT ↔ STORY ASSIGNMENTS
-- ================================================================

-- Past sprint (1): realized stories
INSERT INTO public."SprintUserStories" ("FK_sprintId", "FK_userStoryId") VALUES
  (1, 1), (1, 2);

-- Active sprint (2): in-progress stories
INSERT INTO public."SprintUserStories" ("FK_sprintId", "FK_userStoryId") VALUES
  (2, 3), (2, 4), (2, 5);

-- ================================================================
-- 10. TASKS  — all four Sprint Backlog categories (#28)
-- ================================================================
--   Task 1: UNASSIGNED  – no accepted developer, not finished
--   Task 2: ASSIGNED    – Grega accepted, no active timer
--   Task 3: ACTIVE      – Vito accepted, timer currently running (open timetable row)
--   Task 4: FINISHED    – Anže finished
--   Task 5: UNASSIGNED  – Grega proposed but has not accepted yet (good for #16 demo)

INSERT INTO public."Tasks" (
  id, "FK_userStoryId", description, timecomplexity,
  "FK_proposedDeveloper", "FK_acceptedDeveloper", finished, remaininghours
) OVERRIDING SYSTEM VALUE VALUES
  -- Story 3 – Upravljanje tečajev
  (1, 3, 'Pripravi REST API za upravljanje tečajev',       4.0,
   NULL,                                         NULL,                                         false, 4),
  (2, 3, 'Implementiraj frontend za prikaz tečajev',       4.0,
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',       'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',       false, 3),

  -- Story 4 – Oddaja nalog
  (3, 4, 'Razvij modul za oddajo in pregled nalog',        3.0,
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',       'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',       false, 2),
  (4, 4, 'Zasnuj podatkovno bazo za naloge in ocene',      2.0,
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',       'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',       true,  0),

  -- Story 5 – Forum
  (5, 5, 'Implementiraj forum z nitmi in komentarji',      5.0,
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',       NULL,                                         false, 5);

-- ================================================================
-- 11. TIMETABLES  (#18, #19, #29 Burndown)
-- ================================================================
-- Multiple sessions across the sprint for realistic burndown data.
-- Task 3 has an OPEN entry (stoptime NULL) → makes it "active" status.

INSERT INTO public."TimeTables" (id, "FK_userId", "FK_taskId", starttime, stoptime)
OVERRIDING SYSTEM VALUE VALUES
  -- Task 2 – Grega (assigned, past session)
  (1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 2,
   '2026-03-10 09:00:00+01', '2026-03-10 13:00:00+01'),   -- 4 h

  -- Task 3 – Vito (ACTIVE: last entry has no stoptime)
  (2, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 3,
   '2026-03-12 09:00:00+01', '2026-03-12 12:00:00+01'),   -- 3 h
  (3, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 3,
   '2026-03-14 10:00:00+01', '2026-03-14 12:00:00+01'),   -- 2 h
  (4, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 3,
   now() - interval '2 hours',                  NULL),     -- currently running ← ACTIVE

  -- Task 4 – Anže (finished, multiple sessions)
  (5, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 4,
   '2026-03-08 09:00:00+01', '2026-03-08 11:00:00+01'),   -- 2 h
  (6, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 4,
   '2026-03-09 14:00:00+01', '2026-03-09 17:00:00+01');   -- 3 h

-- ================================================================
-- 12. USER STORY COMMENTS (#10)
-- ================================================================

INSERT INTO public."UserStoryComments" (id, "FK_userId", "FK_userStoryId", content)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 3,
   'Preden začnemo, se dogovorimo o strukturi API-ja – predlagam OpenAPI specifikacijo.'),
  (2, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 3,
   'Strinjam se, bom pripravil osnutek do petka.'),
  (3, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 4,
   'Rok za oddajo nalog mora biti jasno izpostavljen – ključna zahteva naročnika.');

-- ================================================================
-- 13. WALL POSTS (#22, #23, #24)
-- ================================================================
-- Posts 2 and 3 are replies to post 1 (responseTo = 1).
-- Post 4 and 5 are standalone — good for delete demo (#24).

INSERT INTO public."WallPosts" (id, "FK_projectId", "FK_userId", content, "responseTo")
OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
   'Sprint 2 je pričel! Prosim vse razvijalce, da vsak dan zjutraj posodobijo status nalog.', NULL),
  (2, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
   'Razumljeno! Začenjam z REST API-jem za tečaje danes.',                                    1),
  (3, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
   'Jaz se bom lotil modula za oddajo nalog, kakor je dogovorjeno.',                          1),
  (4, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
   'Opomnik: pred zaključkom Sprinta pregledam vse zgodbe. Prosim za pravočasno obvestilo.',  NULL),
  (5, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
   'Podatkovna baza za naloge je dokončana in testirana – zapiram nalogo.',                   NULL);

-- ================================================================
-- 14. DOCUMENTATION (#21)
-- ================================================================

INSERT INTO public."Documentation" (id, "FK_projectId", content)
OVERRIDING SYSTEM VALUE VALUES
(1, 1,
'# E-učilnica – Uporabniška dokumentacija

## 1. Uvod
E-učilnica je spletna platforma za upravljanje učnih tečajev. Namenjena je učiteljem in študentom za upravljanje vsebin, oddajo nalog in medsebojno komunikacijo.

## 2. Prijava v sistem
1. Odprite spletno stran aplikacije.
2. Vnesite **uporabniško ime** in **geslo**.
3. Kliknite gumb **Prijava**.
> Geslo mora biti dolgo vsaj 12 znakov.

## 3. Upravljanje tečajev
- **Ustvarjanje**: Kliknite »+ Nov tečaj«, izpolnite ime in opis ter shranite.
- **Urejanje**: Izberite tečaj in kliknite ikono za urejanje.
- **Brisanje**: Izberite tečaj in potrdite brisanje v pogovornem oknu.

## 4. Oddaja nalog
Študent odda nalogo prek gumba **Oddaj nalogo** na strani tečaja. Rok oddaje je viden na vrhu strani.

## 5. Forum
Vsak tečaj ima lasten forum z nitmi in komentarji. Nov prispevek dodate s klikom na **+ Nova nit**.

## 6. Obveščanje
Sistem samodejno pošlje e-mail ob novih objavah, ko je obveščanje omogočeno v nastavitvah profila.');

-- ================================================================
-- 15. RESET IDENTITY SEQUENCES
-- ================================================================

ALTER TABLE public."Projects"          ALTER COLUMN id RESTART WITH 2;
ALTER TABLE public."Sprints"           ALTER COLUMN id RESTART WITH 4;
ALTER TABLE public."UserStories"       ALTER COLUMN id RESTART WITH 9;
ALTER TABLE public."AcceptanceTests"   ALTER COLUMN id RESTART WITH 9;
ALTER TABLE public."Tasks"             ALTER COLUMN id RESTART WITH 6;
ALTER TABLE public."TimeTables"        ALTER COLUMN id RESTART WITH 7;
ALTER TABLE public."UserStoryComments" ALTER COLUMN id RESTART WITH 4;
ALTER TABLE public."WallPosts"         ALTER COLUMN id RESTART WITH 6;
ALTER TABLE public."Documentation"     ALTER COLUMN id RESTART WITH 2;
