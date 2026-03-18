import './App.css'
import CreateProjectPage from './pages/CreateProjectPage'
import AdminPage from './pages/AdminPage'
import SprintBacklogPage from './pages/SprintBacklogPage'
import { useState, useRef, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage";
import ProductBacklog from "./components/ProductBacklog.jsx";
import LoginPage from "./pages/LoginPage";
import NavbarComponent from "./components/NavbarComponent.jsx";
import SprintPage from "./pages/SprintPage.jsx";
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
    <>
      {/* Navbar naj bo viden na vseh straneh razen na prijavi */}
      {currentUser && (
        <NavbarComponent
          projects={userProjects}
          username={currentUser?.profile?.username ?? ''}
          userInitial={currentUser?.profile?.username?.[0]?.toUpperCase() ?? '?'}
          onLogout={handleLogout}
          isAdmin={isAdmin}
        />
      )}

      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? <Navigate to="/" replace /> : <LoginPage onLogin={async () => {
              const user = await getCurrentUser();
              setCurrentUser(user);
              if (user) await loadProjects(user);
            }} />
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
            !currentUser ? <Navigate to="/login" replace /> : 
            isAdmin ? <CreateProjectPage onProjectCreated={async () => { await loadProjects(currentUser); navigate('/'); }} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/project/:projectId/sprint/:sprintId"
          element={
            !currentUser ? <Navigate to="/login" replace /> : <SprintBacklogPage />
          }
        />
        <Route 
        path="/project/:projectId/sprint" 
        element={<SprintPage />} 
        />

        <Route
          path="/project/:projectId/backlog"
          element={
            !currentUser ? <Navigate to="/login" replace /> : <AddUserStoryPage />
          }
        />

        <Route
          path="/"
          element={
            currentUser ? (
              <div className="app-container">
                <h1>Dobrodošli, {currentUser.profile?.username}</h1>
                <p>Izberite projekt v meniju zgoraj za ogled backloga ali sprinta.</p>
              </div>
            ) : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </>
  );
}

export default App;
