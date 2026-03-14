import { useState, useRef, useEffect } from "react";
import "./App.css";
import AddUserStoryPage from "./pages/ProductBacklogPage"; 
import AdminPage from "./pages/AdminPage";
import DummySprintListComponent from "./components/DummySprintListComponent.jsx";

function App() {
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

     {/* <main className="content">
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
      KOMENTIRANO KER V TEM BRANCHU IMPLEMENTIRAM DRUGE STVARI
      */}

      <DummySprintListComponent />



    </div>
  );
}

export default App;