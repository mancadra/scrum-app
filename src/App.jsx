import './App.css'
import CreateProjectPage from './pages/CreateProjectPage'
import AdminPage from './pages/AdminPage'
import { useState, useRef, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage";
import ProductBacklog from "./components/ProductBacklog.jsx";
import LoginPage from "./pages/LoginPage";
import NavbarComponent from "./components/NavbarComponent.jsx";
import { getCurrentUser, signOut } from "./services/auth";
import { getUsersProjects } from "./services/projects";


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userProjects, setUserProjects] = useState([]);
  const navigate = useNavigate();

  async function loadProjects(user) {
    try {
      const myProjects = await getUsersProjects(user.id);
      setUserProjects(myProjects);
    } catch {
      setUserProjects([]);
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

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setUserProjects([]);
    navigate("/login");
  };

  const isAdmin = currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false;

  if (loadingUser) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onLogin={async () => {
              const user = await getCurrentUser();
              setCurrentUser(user);
              if (user) await loadProjects(user);
            }} />
          )
        }
      />

      <Route
        path="/admin"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : isAdmin ? (
            <AdminPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/create-project"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : isAdmin ? (
            <CreateProjectPage onProjectCreated={async () => { await loadProjects(currentUser); navigate('/'); }} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/project/:projectId/backlog"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : (
            <AddUserStoryPage />
          )
        }
      />

      <Route
        path="/"
        element={
          currentUser ? (
            <>
              <NavbarComponent

                projects={userProjects}
                username={currentUser?.profile?.username ?? ''}
                userInitial={currentUser?.profile?.username?.[0]?.toUpperCase() ?? '?'}
                onLogout={handleLogout}
                isAdmin={isAdmin}

              />
              <div className="app-container">
                {/* main content goes here */}
              </div>
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
