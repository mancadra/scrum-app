-- ================================================================
-- SCRUM APP – DEMO SEED DATA
-- ================================================================
-- Password for all users: testpassword123!
-- Before running this script:
--   1. Run clear_everything_in_db.sql
--   2. Make sure these users already exist in Supabase Auth + public."Users":
--
--   email                  username      name    surname   role
--   admin@scrumapp.si      admin         Admin   Admin     Admin
--   manca@gmail.com        manca         Manca   Drašček   User
--   grega@gmail.com        grega         Grega   Radež     User
--   vito@gmail.com         vito          Vito    Verdnik   User
--   anze@gmail.com         anze          Anže    Judež     User
--   marko@gmail.com        marko         Marko   Poženel   User
--   random@gmail.com       random        Random  Random    User
--   testuser01@gmail.com   testuser01    Test    User01    User
-- ================================================================
-- ================================================================
-- 3. PROJECT
-- ================================================================

INSERT INTO public."Projects" (id, name, description) OVERRIDING SYSTEM VALUE VALUES
  (1, 'E-učilnica',
   'Spletna platforma za upravljanje učnih tečajev, oddajo nalog in komunikacijo med učitelji in študenti.');

-- ================================================================
-- 4. PROJECT MEMBERS & ROLES
-- ================================================================

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
  SELECT u.id, 1, r.id FROM auth.users u, public."ProjectRoles" r
  WHERE u.email = 'marko@gmail.com' AND r."projectRole" = 'Product Owner';

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
  SELECT u.id, 1, r.id FROM auth.users u, public."ProjectRoles" r
  WHERE u.email = 'manca@gmail.com' AND r."projectRole" = 'Scrum Master';

INSERT INTO public."ProjectUsers" ("FK_userId", "FK_projectId", "FK_projectRoleId")
  SELECT u.id, 1, r.id FROM auth.users u, public."ProjectRoles" r
  WHERE u.email IN ('grega@gmail.com','vito@gmail.com','anze@gmail.com')
  AND r."projectRole" = 'Developer';

-- ================================================================
-- 5. SPRINTS
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
-- 6. USER STORIES
-- ================================================================
-- Stories 1–2  → REALIZED
-- Stories 3–5  → IN ACTIVE SPRINT
-- Story 6      → UNASSIGNED with time complexity
-- Stories 7–8  → UNASSIGNED without time complexity

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
-- 7. ACCEPTANCE TESTS
-- ================================================================

INSERT INTO public."AcceptanceTests" (id, description, "FK_userStoryId")
OVERRIDING SYSTEM VALUE VALUES
  (1, 'Prijava z veljavnim uporabniškim imenom in geslom uspe.',               1),
  (2, 'Prijava z napačnim geslom vrne jasno sporočilo o napaki.',              1),
  (3, 'Sistem zabeleži datum in čas zadnje prijave.',                          1),
  (4, 'Nov uporabnik se uspešno ustvari z vsemi obveznimi polji.',             2),
  (5, 'Sistem prepreči podvajanje uporabniškega imena.',                       2),
  (6, 'Tečaj se ustvari in je prikazan na seznamu tečajev učitelja.',          3),
  (7, 'Naloga se odda in je vidna v pregledu oddaj za učitelja.',              4),
  (8, 'Obvestilo prispe v roku ene minute od sprožilnega dogodka.',            6);

-- ================================================================
-- 8. SPRINT ↔ STORY ASSIGNMENTS
-- ================================================================

INSERT INTO public."SprintUserStories" ("FK_sprintId", "FK_userStoryId") VALUES
  (1, 1), (1, 2),
  (2, 3), (2, 4), (2, 5);

-- ================================================================
-- 9. TASKS
-- ================================================================
--   Task 1: UNASSIGNED
--   Task 2: ASSIGNED    – Grega accepted
--   Task 3: ACTIVE      – Vito accepted, timer running
--   Task 4: FINISHED    – Anže finished
--   Task 5: UNASSIGNED  – Grega proposed but not accepted

INSERT INTO public."Tasks" (
  id, "FK_userStoryId", description, timecomplexity,
  "FK_proposedDeveloper", "FK_acceptedDeveloper", finished, remaininghours
) OVERRIDING SYSTEM VALUE
SELECT
  v.id, v.story_id, v.descr, v.tc,
  (SELECT id FROM auth.users WHERE email = v.proposed_email),
  (SELECT id FROM auth.users WHERE email = v.accepted_email),
  v.finished, v.remaining
FROM (VALUES
  (1, 3, 'Pripravi REST API za upravljanje tečajev',  4.0, NULL,                NULL,                false, 4),
  (2, 3, 'Implementiraj frontend za prikaz tečajev',  4.0, 'grega@gmail.com', 'grega@gmail.com', false, 3),
  (3, 4, 'Razvij modul za oddajo in pregled nalog',   3.0, 'vito@gmail.com',  'vito@gmail.com',  false, 2),
  (4, 4, 'Zasnuj podatkovno bazo za naloge in ocene', 2.0, 'anze@gmail.com',  'anze@gmail.com',  true,  0),
  (5, 5, 'Implementiraj forum z nitmi in komentarji', 5.0, 'grega@gmail.com', NULL,                false, 5)
) AS v(id, story_id, descr, tc, proposed_email, accepted_email, finished, remaining);

-- ================================================================
-- 10. TIMETABLES
-- ================================================================

INSERT INTO public."TimeTables" (id, "FK_userId", "FK_taskId", starttime, stoptime)
OVERRIDING SYSTEM VALUE VALUES
  (1, (SELECT id FROM auth.users WHERE email='grega@gmail.com'), 2, '2026-03-10 09:00:00+01', '2026-03-10 13:00:00+01'),
  (2, (SELECT id FROM auth.users WHERE email='vito@gmail.com'),  3, '2026-03-12 09:00:00+01', '2026-03-12 12:00:00+01'),
  (3, (SELECT id FROM auth.users WHERE email='vito@gmail.com'),  3, '2026-03-14 10:00:00+01', '2026-03-14 12:00:00+01'),
  (4, (SELECT id FROM auth.users WHERE email='vito@gmail.com'),  3, now() - interval '2 hours', NULL),
  (5, (SELECT id FROM auth.users WHERE email='anze@gmail.com'),  4, '2026-03-08 09:00:00+01', '2026-03-08 11:00:00+01'),
  (6, (SELECT id FROM auth.users WHERE email='anze@gmail.com'),  4, '2026-03-09 14:00:00+01', '2026-03-09 17:00:00+01');

-- ================================================================
-- 11. USER STORY COMMENTS
-- ================================================================

INSERT INTO public."UserStoryComments" (id, "FK_userId", "FK_userStoryId", content)
OVERRIDING SYSTEM VALUE VALUES
  (1, (SELECT id FROM auth.users WHERE email='manca@gmail.com'), 3, 'Preden začnemo, se dogovorimo o strukturi API-ja – predlagam OpenAPI specifikacijo.'),
  (2, (SELECT id FROM auth.users WHERE email='grega@gmail.com'), 3, 'Strinjam se, bom pripravil osnutek do petka.'),
  (3, (SELECT id FROM auth.users WHERE email='marko@gmail.com'), 4, 'Rok za oddajo nalog mora biti jasno izpostavljen – ključna zahteva naročnika.');

-- ================================================================
-- 12. WALL POSTS
-- ================================================================

INSERT INTO public."WallPosts" (id, "FK_projectId", "FK_userId", content, "responseTo")
OVERRIDING SYSTEM VALUE VALUES
  (1, 1, (SELECT id FROM auth.users WHERE email='manca@gmail.com'), 'Sprint 2 je pričel! Prosim vse razvijalce, da vsak dan zjutraj posodobijo status nalog.', NULL),
  (2, 1, (SELECT id FROM auth.users WHERE email='grega@gmail.com'), 'Razumljeno! Začenjam z REST API-jem za tečaje danes.',                                    1),
  (3, 1, (SELECT id FROM auth.users WHERE email='vito@gmail.com'),  'Jaz se bom lotil modula za oddajo nalog, kakor je dogovorjeno.',                          1),
  (4, 1, (SELECT id FROM auth.users WHERE email='marko@gmail.com'), 'Opomnik: pred zaključkom Sprinta pregledam vse zgodbe. Prosim za pravočasno obvestilo.',  NULL),
  (5, 1, (SELECT id FROM auth.users WHERE email='anze@gmail.com'),  'Podatkovna baza za naloge je dokončana in testirana – zapiram nalogo.',                   NULL);

-- ================================================================
-- 13. DOCUMENTATION
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
-- 14. RESET IDENTITY SEQUENCES
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
