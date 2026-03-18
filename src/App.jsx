import './App.css'
import CreateProjectPage from './pages/CreateProjectPage'
<<<<<<< manca-connect-fe-be-for-user-creation
import AdminPage from './pages/AdminPage'
import { useState, useEffect } from "react";
=======
import { useState, useRef, useEffect } from "react";
>>>>>>> main
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage";
import ProductBacklog from "./components/ProductBacklog.jsx";
import LoginPage from "./pages/LoginPage";
import NavbarComponent from "./components/NavbarComponent.jsx";
import { getCurrentUser, signOut } from "./services/auth";
import { getProjects } from "./services/projects";


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userProjects, setUserProjects] = useState([]);
  const navigate = useNavigate();

  async function loadProjects(user) {
    try {
      const all = await getProjects();
      const mine = all.filter(p =>
        p.ProjectUsers?.some(pu => pu.FK_userId === user.id)
      );
      setUserProjects(mine);
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
<<<<<<< manca-connect-fe-be-for-user-creation
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
            <CreateProjectPage onProjectCreated={() => navigate('/')} />
          ) : (
            <Navigate to="/" replace />
          )
        }
=======
          path="/login"
          element={
            currentUser ? (
                <Navigate to="/" replace />
            ) : (
                <LoginPage onLogin={async () => {
                  const user = await getCurrentUser()
                  setCurrentUser(user)
                }} />
            )
          }
>>>>>>> main
      />

      <Route
        path="/create-project"
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ? (
            <CreateProjectPage onProjectCreated={() => navigate('/')} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/"
        element={
          currentUser ? (
            <>
              <NavbarComponent
<<<<<<< manca-connect-fe-be-for-user-creation
                projects={userProjects}
                username={currentUser?.profile?.username ?? ''}
                userInitial={currentUser?.profile?.username?.[0]?.toUpperCase() ?? '?'}
                onLogout={handleLogout}
                isAdmin={isAdmin}
=======
                  projects={selectedUserProjects}
                  username={currentUser?.profile?.username ?? ''}                                                                                                                                         
                  userInitial={currentUser?.profile?.username?.[0]?.toUpperCase() ?? '?'} 
                  onLogout={handleLogout}
                  isAdmin={currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false}
>>>>>>> main
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
