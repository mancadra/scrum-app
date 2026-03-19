-- Clear all data tables, preserving lookup tables (Priorities, ProjectRoles, Roles)
-- and preserving existing users (auth.users and public."Users")
-- Order respects foreign key constraints

-- Leaf tables first
DELETE FROM public."TimeTables";
DELETE FROM public."AcceptanceTests";
DELETE FROM public."UserStoryComments";

-- WallPost comments before posts (self-referential)
DELETE FROM public."WallPosts" WHERE "responseTo" IS NOT NULL;
DELETE FROM public."WallPosts";

DELETE FROM public."Tasks";
DELETE FROM public."SprintUserStories";
DELETE FROM public."UserRoles";
DELETE FROM public."ProjectUsers";
DELETE FROM public."Documentation";

-- Stories, sprints, projects
DELETE FROM public."UserStories";
DELETE FROM public."Sprints";
DELETE FROM public."Projects";

-- public."Users" and auth.users are intentionally kept
