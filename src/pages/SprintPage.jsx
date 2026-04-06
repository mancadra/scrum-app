import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "../config/supabase";
import { useTasks } from '../hooks/useTasks';
import {
  canAcceptTask,
  canRejectTask,
  categorizeStoryForKanban,
  getProjectRolesForUser,
  getProjectDevelopers,
  getSprintNumber,
  getTaskLoggedHours,
} from '../services/tasks';
import TaskForm from '../components/TaskForm';
import { getStoriesForProject, addStoriesToSprint } from '../services/stories';
import './SprintPage.css';
import '../components/BacklogStoryComponent.css';
import '../components/BacklogStoryDetailsComponent.css';

const STATUS_LABELS = {
  unassigned: 'NEDODELJENO',
  active: 'V DELU',
  testing: 'TESTIRANJE',
  finished: 'ZAKLJUČENO',
};

const formatUserName = (user) => {
  if (!user) return null;
  return user.name && user.surname ? `${user.name} ${user.surname}` : user.username;
};

const SprintPage = () => {
  const { projectId, sprintId } = useParams();
  const { sprintData, setSprintData, loading, fetchSprintBacklog, handleUpdateStoryStatus, handleCreateTask, handleAcceptTask, handleRejectTask, handleFinishTask, handleReopenTask } = useTasks(projectId);
  const [currentUser, setCurrentUser] = useState(null);
  const [sprintNumber, setSprintNumber] = useState(null);
  const [projectDevelopers, setProjectDevelopers] = useState([]);
  const [currentUserProjectRoles, setCurrentUserProjectRoles] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showManageStories, setShowManageStories] = useState(false);
  const [backlogStories, setBacklogStories] = useState([]);
  const [selectedStoryForTask, setSelectedStoryForTask] = useState(null);
  const [selectedStoryForDetails, setSelectedStoryForDetails] = useState(null);
  const [finishConfirm, setFinishConfirm] = useState(null);

  const openStoryDetails = (story) => setSelectedStoryForDetails(story);
  const closeStoryDetails = () => setSelectedStoryForDetails(null);

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

          if (newStatus === 'unassigned')    { accepted = false; realized = false; testing = false; }
          else if (newStatus === 'active')   { accepted = true;  realized = false; testing = false; }
          else if (newStatus === 'testing')  { accepted = true;  realized = false; testing = true;  }
          else if (newStatus === 'finished') { accepted = true;  realized = true;  testing = true;  }

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
    return sprintData.stories.filter(story => categorizeStoryForKanban(story) === status);
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
    if (sprintData) loadBacklog();
  }, [sprintData]);

  useEffect(() => {
    if (sprintId) fetchSprintBacklog(sprintId);
  }, [sprintId, fetchSprintBacklog]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user && projectId) {
        const roles = await getProjectRolesForUser(projectId, user.id);
        setCurrentUserProjectRoles(roles);
      }
    };
    checkUser();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    getProjectDevelopers(projectId).then(setProjectDevelopers).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !sprintId) return;
    getSprintNumber(projectId, sprintId).then(setSprintNumber).catch(console.error);
  }, [projectId, sprintId]);

  const activeStoryForModal = sprintData?.stories?.find(s => s.id === selectedStoryForDetails?.id);

  const isSprintActive = (() => {
    if (!sprintData?.sprint) return false;
    const now = new Date();
    return new Date(sprintData.sprint.startingDate) <= now && new Date(sprintData.sprint.endingDate) >= now;
  })();

  if (loading) return <div className="p-5 text-center">Nalagam Sprint tablo...</div>;

  const modalAllTasks = Object.values(activeStoryForModal?.tasks || {}).flat();
  const modalFinishedCount = modalAllTasks.filter(t => t.finished).length;

  return (
    <div className="dashboard-container p-4">
      <div className="header-section d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{sprintNumber != null ? `Sprint #${sprintNumber}` : 'Sprint Board'}</h2>
          {sprintData?.sprint && (
            <div className="sprint-header__dates">
              <div><span className="sprint-header__date-label">Začetek:</span> {new Date(sprintData.sprint.startingDate).toLocaleDateString('sl-SI')}</div>
              <div><span className="sprint-header__date-label">Konec:</span> {new Date(sprintData.sprint.endingDate).toLocaleDateString('sl-SI')}</div>
            </div>
          )}
        </div>
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
                const allTasks = Object.values(story.tasks || {}).flat();
                const completedTasks = allTasks.filter(task => task.finished).length;
                const totalTasks = allTasks.length;
                const priority = story.Priorities?.priority ?? null;
                const priorityClass = priority === 'Must have' ? 'priority-high' : priority === 'Should have' ? 'priority-medium' : 'priority-low';

                return (
                  <div
                    key={story.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    onClick={() => openStoryDetails(story)}
                    className={`user-story-kanban-card mb-3 ${priorityClass}`}
                  >
                    <div className="card-main-content">
                      <div className="card-header-row">
                        <h6 className="story-title" title={story.name}>
                          {story.name}
                        </h6>
                        <button
                          className="quick-add-task-btn"
                          onClick={(e) => { e.stopPropagation(); openAddTaskModal(story); }}
                          title="Dodaj nalogo"
                        >+</button>
                      </div>

                      {priority && (
                        <span className={`story-priority-badge story-priority-badge--${priorityClass}`}>
                          {priority}
                        </span>
                      )}

                      <div className="card-meta-row">
                        <div className="card-meta-item">
                          <strong>Časovna zahtevnost:</strong> {story.timeComplexity ?? '—'} točk
                        </div>
                        <div className="card-meta-item">
                          <strong>Poslovna vrednost:</strong> {story.businessValue ?? '—'}
                        </div>
                      </div>

                      {totalTasks > 0 && (
                        <div className="card-progress-row">
                          <div className="card-progress-label">
                            <span>Končane naloge: {completedTasks} / {totalTasks}</span>
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

      {/* Potrditveni popup za zaključitev naloge z nezadostnimi urami */}
      {finishConfirm && (
        <div className="modal-overlay" style={{ zIndex: 10200 }} onClick={() => setFinishConfirm(null)}>
          <div className="custom-modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="m-0 fw-bold">Zaključitev naloge</h5>
              <button className="btn-close" onClick={() => setFinishConfirm(null)}></button>
            </div>
            <div className="modal-body-custom">
              <p className="text-muted small mb-3">
                Niste zabeležili vseh ocenjenih ur.<br />
                Zabeleženo: <strong>{finishConfirm.loggedHours} h</strong> / Ocenjeno: <strong>{finishConfirm.task.timecomplexity} h</strong><br /><br />
                Ali ste prepričani, da želite zaključiti nalogo?
              </p>
              <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-sm btn-secondary" onClick={() => setFinishConfirm(null)}>Prekliči</button>
                <button className="btn btn-sm btn-warning" onClick={async () => {
                  const task = finishConfirm.task;
                  setFinishConfirm(null);
                  try { await handleFinishTask(task.id); fetchSprintBacklog(sprintId); }
                  catch (err) { alert(`Napaka: ${err.message}`); }
                }}>Zaključi vseeno</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup za dodajanje nalog */}
      {showAddTask && (
        <div className="modal-overlay" style={{ zIndex: 10001, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddTask(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <div className="modal-header-custom d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0 fw-bold">Nova naloga</h5>
              <button className="modal-close-btn" onClick={() => setShowAddTask(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <p className="text-muted small mb-3">Dodajanje naloge za: <strong>{selectedStoryForTask?.name}</strong></p>
              <TaskForm
                handleCreateTask={handleCreateTask}
                stories={sprintData?.stories || []}
                projectMembers={projectDevelopers}
                preselectedStoryId={selectedStoryForTask?.id}
                onSuccess={() => { setShowAddTask(false); fetchSprintBacklog(sprintId); }}
              />
            </div>
          </div>
        </div>
      )}

      {activeStoryForModal && (
        <div className="backlog-story-details__overlay" style={{ zIndex: 10000 }} onClick={closeStoryDetails}>
          <div className="backlog-story-details" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

            <div className="backlog-story-details__header">
              <div>
                <p className="backlog-story-details__eyebrow">Podrobnosti zgodbe</p>
                <h2>{activeStoryForModal.name}</h2>
              </div>
              <button type="button" className="backlog-story-details__close" onClick={closeStoryDetails} aria-label="Zapri">✕</button>
            </div>

            <div className="backlog-story-details__content">

              <section className="backlog-story-details__section">
                <div className="backlog-story-details__grid">
                  <div>
                    <span className="backlog-story-details__label">Opis</span>
                    <p>{activeStoryForModal.description || '—'}</p>
                  </div>
                  <div>
                    <span className="backlog-story-details__label">Prioriteta</span>
                    <p>{activeStoryForModal.Priorities?.priority ?? '—'}</p>
                  </div>
                  <div>
                    <span className="backlog-story-details__label">Poslovna vrednost</span>
                    <p>{activeStoryForModal.businessValue ?? '—'}</p>
                  </div>
                  <div>
                    <span className="backlog-story-details__label">Časovna zahtevnost</span>
                    <p>{activeStoryForModal.timeComplexity != null ? `${activeStoryForModal.timeComplexity} točk` : '—'}</p>
                  </div>
                </div>
              </section>

              <section className="backlog-story-details__section">
                <div className="sprint-modal-tasks-header">
                  <h3>Naloge</h3>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => openAddTaskModal(activeStoryForModal)}>+ Nova naloga</button>
                </div>

                {Object.values(activeStoryForModal.tasks || {}).flat().length === 0 ? (
                  <p className="sprint-modal-no-tasks">Ni dodanih nalog.</p>
                ) : (
                  <div className="sprint-modal-task-list">
                    {Object.values(activeStoryForModal.tasks || {}).flat().map(task => {
                      const isFinished = !!task.finished;
                      const isAssigned = !!task.FK_acceptedDeveloper;
                      const isAcceptedByMe = task.FK_acceptedDeveloper === currentUser?.id;
                      const canAccept = canAcceptTask(task, currentUser?.id, currentUserProjectRoles);
                      const canReject = canRejectTask(task, currentUser?.id);
                      const devName = formatUserName(task.acceptedDev);
                      const proposedDevName = formatUserName(task.proposedDev);

                      return (
                        <div key={task.id} className={`sprint-modal-task ${isFinished ? 'sprint-modal-task--finished' : ''}`}>
                          <div className="sprint-modal-task__info">
                            <span className="sprint-modal-task__desc">{task.description}</span>
                            <span className="sprint-modal-task__sub">
                              {task.timecomplexity ? `${task.timecomplexity} h` : null}
                              {task.timecomplexity && (isAssigned || isFinished) ? ' · ' : null}
                              {isFinished
                                ? `Zaključeno${devName ? ` · ${devName}` : ''}`
                                : isAssigned
                                  ? `Dodeljeno: ${devName ?? 'Neznan'}`
                                  : null}
                            </span>
                          </div>
                          <div className="sprint-modal-task__action">
                            {isFinished ? (
                              <div className="d-flex align-items-center gap-2">
                                <span className="sprint-modal-badge sprint-modal-badge--done">Zaključeno</span>
                                {isAcceptedByMe && isSprintActive && (
                                  <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                                    try { await handleReopenTask(task.id); fetchSprintBacklog(sprintId); }
                                    catch (err) { alert(`Napaka: ${err.message}`); }
                                  }}>Znova odpri</button>
                                )}
                              </div>
                            ) : isAcceptedByMe ? (
                              <button className="btn btn-sm btn-warning" onClick={async () => {
                                try {
                                  const hours = await getTaskLoggedHours(task.id);
                                  if (hours === 0) {
                                    alert('Za zaključitev naloge morajo biti zabeležene ure dela.');
                                    return;
                                  }
                                  if (task.timecomplexity && hours < task.timecomplexity) {
                                    setFinishConfirm({ task, loggedHours: hours });
                                    return;
                                  }
                                  await handleFinishTask(task.id);
                                  fetchSprintBacklog(sprintId);
                                } catch (err) { alert(`Napaka: ${err.message}`); }
                              }}>Zaključi</button>
                            ) : (
                              <div className="sprint-modal-task__action-col">
                                <span className="sprint-modal-task__proposed">
                                  {proposedDevName ? `Predlagano: ${proposedDevName}` : 'Prosto za prevzem'}
                                </span>
                                {(canAccept || canReject) && (
  isSprintActive ? (
    <div className="sprint-modal-task__action-row d-flex gap-2">
      {canAccept && (
        <button className="btn btn-sm btn-success" disabled={!currentUser} onClick={async () => {
          try { await handleAcceptTask(task.id, currentUser.id); fetchSprintBacklog(sprintId); }
          catch (err) { alert(`Napaka: ${err.message}`); }
        }}>Sprejmi</button>
      )}
      
      {canReject && (
        <button className="btn btn-sm btn-outline-danger" disabled={!currentUser} onClick={async () => {
          try { await handleRejectTask(task.id, currentUser.id); fetchSprintBacklog(sprintId); }
          catch (err) { alert(`Napaka: ${err.message}`); }
        }}>Zavrni</button>
      )}
    </div>
  ) : (
    <span className="sprint-modal-task__inactive">Sprint ni aktiven</span>
  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="sprint-modal-footer">
              {modalAllTasks.length > 0 ? (
                <span className="sprint-modal-footer__count">
                  Končane naloge: <strong>{modalFinishedCount} / {modalAllTasks.length}</strong>
                </span>
              ) : <span />}
              <button className="btn btn-secondary" onClick={closeStoryDetails}>Zapri</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintPage;
