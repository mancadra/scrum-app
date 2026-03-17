import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import CreateProjectPage from './pages/CreateProjectPage'
import './App.css'

function App() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)

  return (
    <>
{/*  COMMENT FROM #4    <div className="app-container">
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
      </div>*/}

      {/* COMMENT FROM #4 {isCreateProjectOpen && (
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
      )}*/}
    </>
  )
}

export default App
