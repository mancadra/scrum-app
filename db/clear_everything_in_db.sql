-- Clear all data tables, preserving lookup tables (Priorities, ProjectRoles, Roles)
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

-- Public users table                                                                                                                                                                            
DELETE FROM public."Users";

-- Supabase auth users (cascades are not guaranteed, so do this explicitly)  
DELETE FROM auth.users;



                                                                                                                                                                                                   