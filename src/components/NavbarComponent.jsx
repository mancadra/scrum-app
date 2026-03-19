import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NavbarComponent.css";

function NavbarComponent({
  projects = [],
  selectedProjectId = null,
  onProjectSelect,
  username = 'user',
  userInitial = 'U',
  onLogout,
  isAdmin = false,
  lastLogin = null,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleUserClick = () => {
    setIsUserMenuOpen((open) => !open);
  };

  const handleLogoutClick = async () => {
    setIsUserMenuOpen(false);
    if (onLogout) {
      await onLogout();
    }
  };

  const handleProjectClick = (project) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-projects">
        {projects.map((project) => (
          <button
            key={project.id}
            className={`navbar-project-button ${selectedProjectId === project.id ? 'active' : ''}`}
            onClick={() => handleProjectClick(project)}
          >
            {project.name}
          </button>
        ))}

        {isAdmin && (
          <>
            <button
              className="navbar-project-button"
              onClick={() => navigate('/create-project')}
            >
              + Nov Projekt
            </button>
            <button
              className="navbar-project-button"
              onClick={() => navigate('/admin')}
            >
              Admin Okno
            </button>
          </>
        )}
      </div>

      <div className="navbar-user">
        <div className="navbar-user-wrapper">
          <button
            type="button"
            className="navbar-user-button"
            onClick={handleUserClick}
          >
            <span className="navbar-username">{username}</span>
            <div className="navbar-avatar">{userInitial}</div>
          </button>
          {lastLogin && (
            <span className="navbar-last-login">
              Zadnja Prijava: {new Date(lastLogin).toLocaleString()}
            </span>
          )}
        </div>

        {isUserMenuOpen && (
          <div className="navbar-dropdown">
            <button
              type="button"
              className="navbar-dropdown-item"
              onClick={handleLogoutClick}
            >
               ODJAVA
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default NavbarComponent;
