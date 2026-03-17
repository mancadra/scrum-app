/*import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import CreateProjectPage from './pages/CreateProjectPage'*/
import './App.css'
import { useState, useRef, useEffect } from "react";
import AddUserStoryPage from "./pages/ProductBacklogPage"; 
import AdminPage from "./pages/AdminPage";
import ProductBacklog from "./components/ProductBacklog.jsx";


function App() {
  /*#4 CODE const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)*/
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState("home");
  const dropdownRef = useRef();

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
      <>
    
    {/*
    COMMENT FROM #4    <div className="app-container">
        <div className="app-hero">
          <div className="logo-row">
            <a href="https://vite.dev" target="_blank" rel="noreferrer">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank" rel="noreferrer">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>

          <h1 className="app-title">Scrum App</h1>
          <p className="app-subtitle">Create and manage projects with your team.</p>

          <button
            type="button"
            className="open-modal-button"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            Create Project
          </button>
        </div>
      </div>

   COMMENT FROM #4 {isCreateProjectOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsCreateProjectOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setIsCreateProjectOpen(false)}
            >
              ×
            </button>

            <CreateProjectPage
              onProjectCreated={() => setIsCreateProjectOpen(false)}
            />
          </div>
        </div>
      )}
      */}
    
    
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

      {/*<main className="content">
        {page === "home" && (
          <div className="home text-center">
            <h1>Dobrodošel v Scrum aplikaciji</h1>
            <p>Tukaj lahko administrator upravlja uporabnike in sistemske pravice.</p>
            <button className="primary-btn" onClick={openAdminPage}>
              Pojdi na administracijo
            </button>
          </div>
        )}

        {page === "AdminPage" && <AdminPage />}
        {page === "story" && <AddUserStoryPage />}
      </main>
      Commented because this branch is doing functionality of something else

      */}

<ProductBacklog />
    </div>
      </>
  );
}

export default App;
