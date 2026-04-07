import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NavbarComponent.css";
import { useTimer } from "../context/TimerContext";

function NavbarComponent({
  projects = [],
  selectedProjectId = null,
  onProjectSelect,
  username = 'user',
  userInitial = 'U',
  onLogout,
  onMFASettings,
  isAdmin = false,
  lastLogin = null,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { activeTimer, elapsedSeconds, handleStopTimer } = useTimer();

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
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
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
        <div className="navbar-right-section">
        {/* --- PRIKAZ ŠTOPARICE --- */}
        {activeTimer && (
          <div className="navbar-timer">
            <div className="me-3" style={{ lineHeight: '1.2' }}>
              <div style={{ fontSize: '9px', color: '#0dcaf0', fontWeight: 'bold' }}>TRENUTNA NALOGA</div>
              <div className="text-truncate fw-semibold" style={{ maxWidth: '180px', fontSize: '13px' }}>
                {activeTimer.taskDescription || `Naloga #${activeTimer.taskId}`}
              </div>
            </div>
            
            <div className="timer-display fs-5 fw-bold text-info border-start ps-3" style={{ fontFamily: 'monospace' }}>
              {formatTime(elapsedSeconds)}
            </div>

            <div className="d-flex gap-1 ms-3">
              <button 
                className="btn-navbar" 
                onClick={handleStopTimer}
                title="Ustavi štoparico"
              >
                ⏸
              </button>
              <button 
                className="btn-navbar" 
                onClick={async () => {
                   if(window.confirm("Želiš ustaviti čas in zaključiti nalogo?")) {
                     await handleStopTimer();
                     // Tukaj dodaš še klic handleFinishTask(activeTimer.taskId)
                     window.location.reload(); // Najhitrejši način za osvežitev stanja na tabli
                   }
                }}
                title="Končaj nalogo"
              >
                ✔
              </button>
            </div>
          </div>
        )}
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
              onClick={() => { setIsUserMenuOpen(false); onMFASettings?.(); }}
            >
              2FA Nastavitve
            </button>
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
      </div>
    </nav>
  );
}

export default NavbarComponent;
