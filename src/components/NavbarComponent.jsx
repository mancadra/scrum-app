import React, { useState } from "react";
import "./NavbarComponent.css";

function NavbarComponent({
  projects = [],
  username = "user",
  userInitial = "U",
  onLogout,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleUserClick = () => {
    setIsUserMenuOpen((open) => !open);
  };

  const handleLogoutClick = async () => {
    setIsUserMenuOpen(false);
    if (onLogout) {
      await onLogout();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-projects">
        {projects.map((project) => (
          <button
            key={project.index}
            className="navbar-project-button"
            onClick={() => console.log("Clicked project:", project.name)}
          >
            {project.name}
          </button>
        ))}
      </div>

      <div className="navbar-user">
        <button
          type="button"
          className="navbar-user-button"
          onClick={handleUserClick}
        >
          <span className="navbar-username">{username}</span>
          <div className="navbar-avatar">{userInitial}</div>
        </button>

        {isUserMenuOpen && (
          <div className="navbar-dropdown">
            <button
              type="button"
              className="navbar-dropdown-item"
              onClick={handleLogoutClick}
            >
              LOG OUT
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default NavbarComponent;