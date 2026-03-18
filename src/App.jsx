import './App.css'
import CreateProjectPage from './pages/CreateProjectPage'
import AdminPage from './pages/AdminPage'
import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage";
import LoginPage from "./pages/LoginPage";
import NavbarComponent from "./components/NavbarComponent.jsx";
import SprintPage from "./pages/SprintPage.jsx";
import { getCurrentUser, signOut } from "./services/auth";
import { getUsersProjects, getProjectUsers } from "./services/projects";
import { getStoriesForProject } from "./services/stories";
import { getSprintsForProject } from "./services/sprints";
import ProjectPageComponent from "./components/ProjectPageComponent.jsx";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isPostLoginLoading, setIsPostLoginLoading] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectStories, setSelectedProjectStories] = useState([]);
  const [selectedProjectSprints, setSelectedProjectSprints] = useState([]);
  const [selectedProjectUsers, setSelectedProjectUsers] = useState([]);
  const navigate = useNavigate();

  async function loadProjects(user) {
    try {
      const myProjects = await getUsersProjects(user.id);
      setUserProjects(myProjects);
      setSelectedProject((prevSelectedProject) => {
        if (prevSelectedProject && myProjects.some((project) => project.id === prevSelectedProject.id)) {
          return prevSelectedProject;
        }
        return myProjects[0] ?? null;
      });
    } catch {
      setUserProjects([]);
      setSelectedProject(null);
    }
  }

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) await loadProjects(user);
      setLoadingUser(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSelectedProjectData() {
      if (!selectedProject?.id) {
        setSelectedProjectStories([]);
        setSelectedProjectSprints([]);
        setSelectedProjectUsers([]);
        return;
      }

      try {
        const [stories, sprints, users] = await Promise.all([
          getStoriesForProject(selectedProject.id),
          getSprintsForProject(selectedProject.id),
          getProjectUsers(selectedProject.id),
        ]);

        setSelectedProjectStories(stories);
        setSelectedProjectSprints(sprints);
        setSelectedProjectUsers(users);
      } catch {
        setSelectedProjectStories([]);
        setSelectedProjectSprints([]);
        setSelectedProjectUsers([]);
      }
    }

    loadSelectedProjectData();
  }, [selectedProject]);

  const refreshSelectedProjectData = async () => {
    if (!selectedProject?.id) return;

    try {
      const [stories, sprints, users] = await Promise.all([
        getStoriesForProject(selectedProject.id),
        getSprintsForProject(selectedProject.id),
        getProjectUsers(selectedProject.id),
      ]);

      setSelectedProjectStories(stories);
      setSelectedProjectSprints(sprints);
      setSelectedProjectUsers(users);
    } catch {
      setSelectedProjectStories([]);
      setSelectedProjectSprints([]);
      setSelectedProjectUsers([]);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setUserProjects([]);
    setSelectedProject(null);
    setSelectedProjectStories([]);
    setSelectedProjectSprints([]);
    setSelectedProjectUsers([]);
    navigate("/login");
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    navigate('/');
  };

  const isAdmin = currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false;

  if (loadingUser || isPostLoginLoading) {
    return (
      <div className="app-loading">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {currentUser && (
        <NavbarComponent
          projects={userProjects}
          selectedProjectId={selectedProject?.id ?? null}
          onProjectSelect={handleProjectSelect}
          username={currentUser?.profile?.username ?? ''}
          userInitial={currentUser?.profile?.username?.[0]?.toUpperCase() ?? '?'}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          lastLogin={currentUser?.profile?.lastLogin ?? null}
        />
      )}

      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                onLogin={async () => {
                  setIsPostLoginLoading(true);
                  try {
                    const user = await getCurrentUser();
                    setCurrentUser(user);
                    if (user) await loadProjects(user);
                    navigate("/", { replace: true });
                  } finally {
                    setIsPostLoginLoading(false);
                  }
                }}
              />
            )
          }
        />

        <Route
          path="/admin"
          element={
            !currentUser ? <Navigate to="/login" replace /> : 
            isAdmin ? <AdminPage /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/create-project"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              <CreateProjectPage
                onProjectCreated={async () => {
                  await loadProjects(currentUser);
                  navigate('/');
                }}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/project/:projectId/sprint/:sprintId"
          element={!currentUser ? <Navigate to="/login" replace /> : <SprintPage />}
        />


        <Route
          path="/project/:projectId/backlog"
          element={!currentUser ? <Navigate to="/login" replace /> : <AddUserStoryPage />}
        />

        <Route
            path="/"
            element={
              currentUser ? (
                  selectedProject ? (
                      <ProjectPageComponent
                          project={selectedProject}
                          stories={selectedProjectStories}
                          sprints={selectedProjectSprints}
                          onStoryCreated={refreshSelectedProjectData}
                          onSprintCreated={refreshSelectedProjectData}
                      />
                  ) : (
                      <Navigate to="/create-project" replace />
                  )
              ) : (
                  <Navigate to="/login" replace />
              )
            }
        />
      </Routes>
    </>
  );
}

export default App;
