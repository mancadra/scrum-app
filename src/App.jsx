import { useState, useRef, useEffect } from "react";
import "./App.css";
import AddUserPage from "./pages/AddUserPage";
import AddUserStoryPage from "./pages/AddUserStoryPage";

function App() {

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [page, setPage] = useState("home");

  const dropdownRef = useRef();

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const openAddUser = () => {
    setPage("addUser");
    setDropdownOpen(false);
  };

  const openUserStory = () => {
  setPage("story");
  setDropdownOpen(false);
};

  const goHome = () => {
    setPage("home");
  };

  // zapre dropdown če klikneš drugje
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

        <div className="logo" onClick={goHome}>
          Scrum Manager
        </div>

        <div className="user-menu" ref={dropdownRef}>

          <button className="user-button" onClick={toggleDropdown}>
            <div className="avatar">A</div>
            Administrator
            <span className="arrow">▼</span>
          </button>

          {dropdownOpen && (
            <div className="dropdown">

              <button onClick={openAddUser}>
                Dodaj uporabnika
              </button>

              <button onClick={openUserStory}>
              Dodaj uporabniško zgodbo
              </button>

              <button onClick={goHome}>
                Domov
              </button>

              <hr />

              <button className="logout">
                Odjava
              </button>

            </div>
          )}

        </div>

      </nav>

      {/* CONTENT */}
      <div className="content">

        {page === "home" && (
          <div className="home">

            <h1>Dobrodošel v Scrum aplikaciji</h1>

            <p>
              Tukaj lahko administrator upravlja uporabnike in sistemske pravice.
            </p>

            <button className="primary-btn" onClick={openAddUser}>
              Dodaj novega uporabnika
            </button>

          </div>
        )}

        {page === "addUser" && <AddUserPage />}
        {page === "story" && <AddUserStoryPage />}

      </div>

    </div>
  );
}

export default App;