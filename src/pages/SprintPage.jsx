import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "../config/supabase";
import { useTasks } from '../hooks/useTasks';
import TaskForm from '../components/TaskForm';
import { getStoriesForProject, addStoriesToSprint } from '../services/stories';
import './SprintPage.css';

const SprintPage = () => {
  const { projectId, sprintId } = useParams();
  const { sprintData, setSprintData, loading, fetchSprintBacklog, handleUpdateStoryStatus, handleCreateTask, handleAcceptTask } = useTasks(projectId);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showManageStories, setShowManageStories] = useState(false);
  const [backlogStories, setBacklogStories] = useState([]);
  const [selectedStoryForTask, setSelectedStoryForTask] = useState(null);
  const [selectedStoryForDetails, setSelectedStoryForDetails] = useState(null);

  const openStoryDetails = (story) => {
    setSelectedStoryForDetails(story);
  };
  const closeStoryDetails = () => {
    setSelectedStoryForDetails(null);
  };

  const handleAddStoryToSprint = async (storyId) => {
    const activeSprintId = sprintId || sprintData?.sprint?.id;
    if (!activeSprintId) {
      alert("Napaka: ID sprinta ni najden.");
      return;
    }
    try {
      await addStoriesToSprint(activeSprintId, [storyId]);
      await fetchSprintBacklog(activeSprintId);
      await loadBacklog();
      alert("Zgodba uspešno dodana v sprint!");
    } catch (err) {
      console.error("Napaka pri dodajanju zgodbe:", err);
      alert(`Napaka: ${err.message}`);
    }
  };

  const handleDragStart = (e, storyId) => {
    e.dataTransfer.setData("storyId", storyId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const storyId = parseInt(e.dataTransfer.getData("storyId"));

    setSprintData(prevData => {
      if (!prevData || !prevData.stories) return prevData;
      const updatedStories = prevData.stories.map(story => {
        if (story.id === storyId) {
          let accepted = story.accepted;
          let realized = story.realized;
          let testing = story.testing;

          if (newStatus === 'unassigned') { accepted = false; realized = false; testing = false; }
          else if (newStatus === 'active') { accepted = true; realized = false; testing = false; }
          else if (newStatus === 'testing') { accepted = true; realized = false; testing = true; }
          else if (newStatus === 'finished') { accepted = true; realized = true; testing = true; }

          return { ...story, accepted, realized, testing };
        }
        return story;
      });
      return { ...prevData, stories: updatedStories };
    });

    try {
      await handleUpdateStoryStatus(storyId, newStatus);
    } catch (err) {
      alert("Ups, v bazi se je nekaj zalomilo. Osvežujem tablo...");
      fetchSprintBacklog(sprintId);
    }
  };

  const openAddTaskModal = (story) => {
    setSelectedStoryForTask(story);
    setShowAddTask(true);
  };

  const getStoriesByStatus = (status) => {
    if (!sprintData?.stories) return [];
    console.log(`Filtriram zgodbe za status: ${status}`, sprintData.stories);
    return sprintData.stories.filter(story => {
      switch (status) {
        case 'unassigned': return !story.accepted && !story.realized && !story.testing;
        case 'active': return story.accepted && !story.realized && !story.testing;
        case 'testing': return story.accepted && !story.realized && story.testing;
        case 'finished': return story.accepted && story.realized && story.testing;
        default: return false;
      }
    });
  };

  const loadBacklog = async () => {
    try {
      const allStories = await getStoriesForProject(projectId);
      const eligible = allStories.filter(s => {
        const isEstimated = (s.timeComplexity && s.timeComplexity > 0);
        const isNotDone = !s.realized;
        const notInCurrentSprint = s.sprintId !== parseInt(sprintId);
        return isEstimated && isNotDone && notInCurrentSprint;
      });
      setBacklogStories(eligible);
    } catch (err) {
      console.error("Napaka pri nalaganju backloga", err);
    }
  };

  useEffect(() => {
    if (sprintData) {
      loadBacklog();
    }
  }, [sprintData]);

  useEffect(() => {
    if (sprintId) fetchSprintBacklog(sprintId);
  }, [sprintId, fetchSprintBacklog]);

  useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    console.log("Uporabnik naložen:", user?.id);
  };

  checkUser();
}, []);

  const activeStoryForModal = sprintData?.stories?.find(s => s.id === selectedStoryForDetails?.id);

  const STATUS_LABELS = { unassigned: 'NEDODELJENO', active: 'V DELU', testing: 'TESTIRANJE', finished: 'ZAKLJUČENO' };

  if (loading) return <div className="p-5 text-center">Nalagam Sprint tablo...</div>;

  return (
    <div className="dashboard-container p-4">
      <div className="header-section d-flex justify-content-between align-items-center mb-4">
        <h2>Sprint Board: {sprintData?.sprint?.name || "Neznan"}</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => setShowManageStories(true)}>Uredi vsebino</button>
        </div>
      </div>

      <div className="kanban-board four-columns">
        {['unassigned', 'active', 'testing', 'finished'].map(status => (
          <div key={status} className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
            <h5 className={`column-header ${status}`}>{STATUS_LABELS[status]}</h5>
            
            <div className="story-list">
              {getStoriesByStatus(status).map(story => {
                // 1. POPRAVEK: Izračun premaknjen znotraj map funkcije
                const allTasks = Object.values(story.tasks || {}).flat();
                const completedTasks = allTasks.filter(task => task.realized).length;
                const totalTasks = allTasks.length;
                const priorityClass = story.priority === 'H' ? 'priority-high' : story.priority === 'M' ? 'priority-medium' : 'priority-low';

                return (
                  <div 
                    key={story.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    onClick={() => openStoryDetails(story)}
                    className={`user-story-kanban-card modern-card shadow-sm mb-3 ${priorityClass}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-priority-indicator"></div>
                    <div className="card-main-content p-3">
                      <div className="card-header-row d-flex justify-content-between align-items-start mb-2">
                        <h6 className="story-title m-0 fw-bold text-truncate" title={story.name}>
                          <span className="story-id text-muted me-1">#{story.id}</span>
                          {story.name}
                        </h6>
                        <button 
                          className="btn btn-xs btn-light quick-add-task-btn" 
                          onClick={(e) => { e.stopPropagation(); openAddTaskModal(story); }}
                          title="Hitro dodaj nalogo"
                        >+</button>
                      </div>

                      <div className="card-meta-row d-flex justify-content-between align-items-center mb-2 small">
                        <div className="story-points">
                          <span className="badge bg-light text-dark border rounded-pill">
                            {story.timeComplexity ? `${story.timeComplexity} točk` : '? točk'}
                          </span>
                        </div>
                        {story.FK_developer_story ? (
                          <div className="story-assignee" title={`Dodeljeno: ${story.developer_story_name}`}>
                            <span className="avatar-initials bg-info text-white rounded-circle">
                              {story.developer_story_name?.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="story-assignee text-muted" title="Nedodeljeno">?</div>
                        )}
                      </div>

                      {totalTasks > 0 && (
                        <div className="card-progress-row mt-2">
                          <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                            <span>Naloge </span>
                            <span>{completedTasks} / {totalTasks}</span>
                          </div>
                          <div className="progress" style={{ height: '5px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{ width: `${(completedTasks / totalTasks) * 100}%` }} 
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })} 
            </div>
          </div>
        ))}
      </div>

      {/* Modal za dodajanje zgodb v sprint */}
      {showManageStories && (
        <div className="modal-backdrop show" style={{ zIndex: 1040 }}>
          <div className="modal show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header bg-dark text-white">
                  <h5 className="modal-title">Dodajanje zgodb v sprint</h5>
                  <button className="btn-close btn-close-white" onClick={() => setShowManageStories(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="list-group">
                    {backlogStories.length > 0 ? backlogStories.map(story => (
                      <div key={story.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">{story.name}</h6>
                          <span className="badge bg-secondary">Točke: {story.timeComplexity}</span>
                        </div>
                        <button className="btn btn-sm btn-success" onClick={() => handleAddStoryToSprint(story.id)}>
                          Dodaj v Sprint
                        </button>
                      </div>
                    )) : (
                      <div className="text-center p-3 text-muted">Vse primerne zgodbe so že v sprintu.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup za dodajanje nalog */}
      {showAddTask && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddTask(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <div className="modal-header-custom d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0 fw-bold">Nova naloga</h5>
              <button className="btn-close" onClick={() => setShowAddTask(false)}></button>
            </div>
            <div className="modal-body-custom">
              <p className="text-muted small mb-3">Dodajanje naloge za: <strong>{selectedStoryForTask?.name}</strong></p>
              <TaskForm 
                handleCreateTask={handleCreateTask}
                stories={sprintData?.stories || []} 
                preselectedStoryId={selectedStoryForTask?.id}
                onSuccess={() => { setShowAddTask(false); fetchSprintBacklog(sprintId); }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. POPRAVEK: Popup za podrobnosti zgodbe (Položaj in z-index) */}
      {activeStoryForModal && (
        <div className="modal show d-block" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeStoryDetails}>
          <div className="modal-dialog modal-lg" style={{ width: '100%', maxWidth: '800px', margin: 'auto', backgroundColor: 'white' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">#{activeStoryForModal.id}: {activeStoryForModal.name}</h5>

              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <section className="mb-4">
                  <h6 className="fw-bold text-uppercase small text-muted">Opis zgodbe</h6>
                  <p>{activeStoryForModal.description || "Ni podanega opisa."}</p>
                </section>
                <section>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-uppercase small text-muted m-0">Naloge</h6>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openAddTaskModal(activeStoryForModal)}>+ Nova naloga</button>
                  </div>
                  <div className="list-group">
                    {Object.values(activeStoryForModal.tasks || {}).flat().map(task => {
  // Preverimo, če je naloga že dodeljena (pazimo na null/undefined/prazne nize)
  const isAssigned = !!task.FK_acceptedDeveloper; 

  return (
    <div key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <div className={`fw-bold ${isAssigned ? 'text-muted' : ''}`}>
          {task.description}
        </div>
        <div className="small text-muted">
           {isAssigned ? `👤 Dodeljeno: ${task.username}` : '⚪ Na voljo za prevzem'}
        </div>
      </div>

      {/* Gumb prikažemo samo, če naloga NI dodeljena */}
      {!isAssigned ? (
        <button 
          className="btn btn-sm btn-success"
          disabled={!currentUser} // Preprečimo klik, če se uporabnik še nalaga
          onClick={async () => {
            if (task.FK_acceptedDeveloper) {
              alert("Ta naloga je bila pravkar dodeljena nekomu drugemu!");
              return;
            }
            
            await handleAcceptTask(task.id, currentUser.id);
            // NUJNO: Osvežimo podatke, da gumb izgine in se prikaže ime
            fetchSprintBacklog(sprintId); 
          }}
        >
          Sprejmi
        </button>
      ) : (
        <span className="badge bg-light text-dark border">Zasedeno</span>
      )}
    </div>
  );
})}
                  </div>
                </section>
              </div>
              <div className="modal-footer bg-light">
                <button className="btn btn-secondary" onClick={closeStoryDetails}>Zapri</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintPage;