/*import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import CreateProjectPage from './pages/CreateProjectPage'*/
import './App.css'
import { useState, useRef, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage"; 
import AdminPage from "./pages/AdminPage";
import ProductBacklog from "./components/ProductBacklog.jsx";
import LoginPage from "./pages/LoginPage";
import NavbarComponent from "./components/NavbarComponent.jsx";
import { getCurrentUser, signOut } from "./services/auth";
import { projects, users } from "./dummyData";


function App() {
  let selectedUserIndex = 0;  /*FOR TESTING ON DUMMY DATA*/

  const selectedUser = users[selectedUserIndex];
  const selectedUserProjects = selectedUser.projectIndexes.map((projectIndex) => ({
    name: projects[projectIndex],
    index: projectIndex,
  }));

  const selectedUserDisplayName = selectedUser.username;
  const selectedUserInitial = selectedUser.username?.[0]?.toUpperCase() || "?";

  
  
  
  
  
  
  /*#4 CODE const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)*/
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const dropdownRef = useRef();
  const navigate = useNavigate();

// ... existing code ...

  const openAdminPage = () => {
    setPage("AdminPage");
    setDropdownOpen(false);
  };

  const openUserStory = () => {
    setPage("story");
    setDropdownOpen(false);
  };

  const goHome = () => {
    setPage("home");
    setDropdownOpen(false);
  };

  const goToLoginPage = () => {
    navigate("/login");
  };

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      console.log(user ? "User is logged in:" : "User is not logged in:", user);
      setCurrentUser(user);
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    navigate("/login");
  };

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
                <LoginPage onLogin={setCurrentUser} />
            )
          }
      />

      <Route
        path="/"
        element={
          currentUser ? (
            <>
              <NavbarComponent
                  projects={selectedUserProjects}
                  username={selectedUserDisplayName}
                  userInitial={selectedUserInitial}
                  onLogout={handleLogout}
              />
              <div className="app-container">

// ... existing code ...

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
