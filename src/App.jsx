/*import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import CreateProjectPage from './pages/CreateProjectPage'*/
import './App.css'
import { useState, useRef, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AddUserStoryPage from "./pages/ProductBacklogPage"; 
import AdminPage from "./pages/AdminPage";
import ProductBacklog from "./components/ProductBacklog.jsx";
import LoginPage from "./pages/LoginPage";


function App() {
  /*#4 CODE const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)*/
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState("home");
  const dropdownRef = useRef();
  const navigate = useNavigate();

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <div className="app-container">
              {/* NAVBAR */}
              <nav className="navbar">
                <div className="logo" onClick={goHome} style={{ cursor: 'pointer' }}>
                  Scrum Manager
                </div>

                <div className="user-menu" ref={dropdownRef}>
                  <button className="user-button" onClick={toggleDropdown}>
                    <div className="avatar">A</div>
                    Administrator <span className="arrow">▼</span>
                  </button>

                  {dropdownOpen && (
                    <div className="dropdown">
                      <button onClick={openAdminPage}>Upravljanje uporabnikov</button>
                      <button onClick={openUserStory}>Dodaj uporabniško zgodbo</button>
                      <button onClick={goHome}>Domov</button>
                      <hr />
                      <button className="logout">Odjava</button>
                    </div>
                  )}
                </div>
              </nav>

              <button className="primary-btn" onClick={goToLoginPage}>
                GO TO LOGIN PAGE
              </button>
            </div>
          </>
        }
      />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
