import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTimer } from '../context/TimerContext';
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
  editTask,
  deleteTask,
} from '../services/tasks';
import TaskForm from '../components/TaskForm';
import BurndownChartComponent from '../components/BurndownChartComponent';
import { getStoriesForProject, addStoriesToSprint, markStoryRealized, markStoryRejected, getStoryComments, addStoryComment } from '../services/stories';
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
  const {
    sprintData,
    setSprintData,
    loading,
    fetchSprintBacklog,
    handleUpdateStoryStatus,
    handleCreateTask,
    handleAcceptTask,
    handleRejectTask,
    handleFinishTask,
    handleReopenTask,
  } = useTasks(projectId);
  const { activeTimer, elapsedSeconds, handleStartTimer, handleStopTimer } = useTimer();
  // Usage in task row:
  //   const isMyTimerRunning = activeTimer?.taskId === task.id;
  //   Start: await handleStartTimer(task.id); fetchSprintBacklog(sprintId);
  //   Stop:  await handleStopTimer();         fetchSprintBacklog(sprintId);
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
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'burndown'
  const [storyComments, setStoryComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [canComment, setCanComment] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
const [taskToEdit, setTaskToEdit] = useState(null);


  const openStoryDetails = (story) => {
    setSelectedStoryForDetails(story);
    setStoryComments([]);
    setNewComment('');
    setCommentError('');
    if (story?.id) {
      getStoryComments(story.id).then(setStoryComments).catch(() => setStoryComments([]));
    }
  };
  const closeStoryDetails = () => setSelectedStoryForDetails(null);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const totalSprintPoints = (sprintData?.stories ?? []).reduce(
    (sum, s) => sum + (s.timeComplexity ?? 0), 0
  );
  const velocity = sprintData?.sprint?.startingSpeed ?? 0;
  const pointsExceeded = totalSprintPoints > velocity;

  const handleAddStoryToSprint = async (storyId) => {
    const activeSprintId = sprintId || sprintData?.sprint?.id;
    if (!activeSprintId) {
      alert("Napaka: ID sprinta ni najden.");
      return;
    }
    const story = backlogStories.find(s => s.id === storyId);
    const storyPoints = story?.timeComplexity ?? 0;
    if (totalSprintPoints + storyPoints > velocity) {
      alert(`Dodajanje te zgodbe bi prekoračilo hitrost sprinta (${velocity} točk). Trenutno dodeljeno: ${totalSprintPoints} točk, zgodba zahteva: ${storyPoints} točk.`);
      return;
    }
    try {
      await addStoriesToSprint(activeSprintId, [storyId]);
      await fetchSprintBacklog(activeSprintId);
      await loadBacklog();
      //alert("Zgodba uspešno dodana v sprint!");
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
          let done = story.done;
          console.log(done);
          
          let testing = story.testing;

          if (newStatus === 'unassigned')    { accepted = false; done = false; testing = false; }
          else if (newStatus === 'active')   { accepted = true;  done = false; testing = false; }
          else if (newStatus === 'testing')  { accepted = true;  done = false; testing = true;  }
          else if (newStatus === 'finished') { accepted = true;  done = true;  testing = true;  }

          return { ...story, accepted, done, testing };
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
        const isNotDone = !s.done;
        const notInCurrentSprint = s.sprintId !== parseInt(sprintId);
        return isEstimated && isNotDone && notInCurrentSprint;
      });
      setBacklogStories(eligible);
    } catch (err) {
      console.error("Napaka pri nalaganju backloga", err);
    }
  };

  const handleEditTaskSubmit = async (taskId, updatedData) => {
  try {
    await editTask(taskId, updatedData); // Kliče tvoj backend
    setShowEditTask(false);
    fetchSprintBacklog(sprintId); // Osveži UI
    alert("Naloga uspešno posodobljena!");
  } catch (err) {
    alert(`Napaka pri urejanju: ${err.message}`);
  }
};

const handleDeleteTaskClick = async (taskId) => {
  if (!window.confirm("Ali ste prepričani, da želite izbrisati to nalogo?")) return;
  
  try {
    await deleteTask(taskId); // Kliče tvoj backend
    fetchSprintBacklog(sprintId); // Osveži UI
    alert("Naloga uspešno izbrisana!");
  } catch (err) {
    alert(`Napaka pri brisanju: ${err.message}`);
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

  // ── Burndown-only view ──────────────────────────────────────────────────────
  if (activeTab === 'burndown') {
    return (
      <div className="dashboard-container p-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <h2 className="mb-0">{sprintNumber != null ? `Sprint #${sprintNumber}` : 'Sprint Board'}</h2>
          <div className="sprint-tab-bar">
            <button
              className={`sprint-tab-btn${activeTab === 'board' ? ' sprint-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              Tabla
            </button>
            <button
              className={`sprint-tab-btn${activeTab === 'burndown' ? ' sprint-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('burndown')}
            >
              Burndown Chart
            </button>
          </div>
        </div>
        <BurndownChartComponent sprintId={parseInt(sprintId)} sprintNumber={sprintNumber} />
      </div>
    );
  }

  const modalAllTasks = Object.values(activeStoryForModal?.tasks || {}).flat();
  const modalFinishedCount = modalAllTasks.filter(t => t.finished).length;

  const isProductOwner = currentUserProjectRoles.includes('Product Owner');
  const isDeveloper = currentUserProjectRoles.includes('Developer');
  const isScrumMaster = currentUserProjectRoles.includes('Scrum Master');
const canManageTasks = isScrumMaster || isDeveloper;

  return (
    <div className="dashboard-container p-4">
      <div className="header-section d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center gap-3 mb-1">
            <h2 className="mb-0">{sprintNumber != null ? `Sprint #${sprintNumber}` : 'Sprint Board'}</h2>
            <div className="sprint-tab-bar">
              <button
                className={`sprint-tab-btn${activeTab === 'board' ? ' sprint-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('board')}
              >
                Tabla
              </button>
              <button
                className={`sprint-tab-btn${activeTab === 'burndown' ? ' sprint-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('burndown')}
              >
                Burndown Chart
              </button>
            </div>
          </div>
          {sprintData?.sprint && (
            <div className="sprint-header__dates">
              <div><span className="sprint-header__date-label">Začetek:</span> {new Date(sprintData.sprint.startingDate).toLocaleDateString('sl-SI')}</div>
              <div><span className="sprint-header__date-label">Konec:</span> {new Date(sprintData.sprint.endingDate).toLocaleDateString('sl-SI')}</div>
              <div>
                <span className="sprint-header__date-label">Točke / Hitrost:</span>{' '}
                <span style={pointsExceeded ? { color: '#dc2626', fontWeight: 700 } : {}}>
                  {totalSprintPoints}
                </span>
                {' / '}
                {velocity}
                {pointsExceeded && (
                  <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: '0.5rem' }}>
                    (presežek: +{totalSprintPoints - velocity})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="backlog-sidebar bg-white rounded shadow-sm border" style={{ minWidth: '320px', maxWidth: '320px' }}>
          <div className="bg-dark text-white p-3 border-bottom rounded-top">
            <h5 className="m-0 mb-2">Dodaj v sprint</h5>
            <div style={{ fontSize: '0.82rem' }}>
              <span>Točke: </span>
              <span style={pointsExceeded ? { color: '#fca5a5', fontWeight: 700 } : { color: '#86efac', fontWeight: 700 }}>
                {totalSprintPoints}
              </span>
              <span> / {velocity}</span>
              {pointsExceeded && (
                <span style={{ color: '#fca5a5', fontWeight: 700 }}> (+{totalSprintPoints - velocity} presežek)</span>
              )}
            </div>
            <div className="progress mt-1" style={{ height: '6px' }}>
              <div
                className={`progress-bar ${pointsExceeded ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${Math.min((totalSprintPoints / (velocity || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="sidebar-content" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
            <div className="list-group list-group-flush">
              {backlogStories.length > 0 ? backlogStories.map(story => {
                const wouldExceed = totalSprintPoints + (story.timeComplexity ?? 0) > velocity;
                return (
                  <div key={story.id} className="sidebar-story">
                    <div className="sidebar-story-info">
                      <h6 className="sidebar-story-title">{story.name}</h6>
                      <span className={`sidebar-story-priority badge ${story.Priorities?.priority === 'Must have' ? 'bg-danger' : story.Priorities?.priority === 'Should have' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {story.Priorities?.priority ?? 'Ni prioritete'}
                      </span>
                      <span className="sidebar-story-complexity">Zahtevnost: {story.timeComplexity} točk</span>
                    </div>
                    <div className={`sidebar-btn-wrapper${wouldExceed ? ' sidebar-btn-wrapper--disabled' : ''}`}>
                      <button
                        className="sidebar-add-btn"
                        onClick={() => handleAddStoryToSprint(story.id)}
                        disabled={wouldExceed}
                      >
                        + Dodaj v Sprint
                      </button>
                      {wouldExceed && (
                        <span className="sidebar-btn-tooltip">
                          Prekoračitev hitrosti sprinta ({velocity} točk).<br />
                          Skupaj: {totalSprintPoints} + {story.timeComplexity} = {totalSprintPoints + (story.timeComplexity ?? 0)} točk.
                        </span>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center p-4 text-muted">Vse primerne zgodbe so že v sprintu.</div>
              )}
            </div>
          </div>
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
                const canMarkRealized = status === 'testing' && isProductOwner && !story.realized;
                const canRejectStory = status !== 'finished' && isProductOwner && !story.realized;

                return (
                  <div
                    key={story.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    onClick={() => openStoryDetails(story)}
                    className={`user-story-kanban-card mb-3 ${priorityClass} ${story.realized ? 'user-story-kanban-card--realized' : ''}`}
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

                      {canMarkRealized && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success mt-2"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await markStoryRealized(story.id);
                              await fetchSprintBacklog(sprintId);
                            } catch (err) {
                              alert(`Napaka: ${err.message}`);
                            }
                          }}
                        >
                          Označi kot realizirano
                        </button>
                      )}

                      {canRejectStory && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger mt-2"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await markStoryRejected(story.id);
                              await fetchSprintBacklog(sprintId);
                            } catch (err) {
                              alert(`Napaka: ${err.message}`);
                            }
                          }}
                        >
                          Označi kot zavrnjeno
                        </button>
                      )}

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
                  try { await handleFinishTask(task.id); }
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
                      const isAccepted = !!task.FK_acceptedDeveloper;
                      const canDeleteThisTask = canManageTasks && !isAccepted;

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
                          {canManageTasks && (
                          <div className="d-flex gap-2 ms-3 border-start ps-3">
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToEdit(task);
                                setShowEditTask(true);
                              }}
                              title="Uredi nalogo"
                            >
                              ✎ Uredi
                            </button>
                            
                            {/* Gumb za brisanje prikažemo samo, če naloga še ni sprejeta */}
                            {canDeleteThisTask ? (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTaskClick(task.id);
                                }}
                                title="Izbriši nalogo"
                              >
                                🗑 Briši
                              </button>
                            ) : (
                              <button 
                                className="btn btn-sm btn-outline-secondary" 
                                disabled 
                                title="Naloge, ki je že sprejeta, ni mogoče izbrisati"
                              >
                                🗑 Briši
                              </button>
                            )}
                          </div>
                        )}
                          <div className="sprint-modal-task__action">
                            {isFinished ? (
                              <div className="d-flex align-items-center gap-2">
                                <span className="sprint-modal-badge sprint-modal-badge--done">Zaključeno</span>
                                {isAcceptedByMe && isSprintActive && (
                                  <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                                    try { await handleReopenTask(task.id); }
                                    catch (err) { alert(`Napaka: ${err.message}`); }
                                  }}>Znova odpri</button>
                                )}
                              </div>
                            ) : isAcceptedByMe ? (
                              <div className="d-flex align-items-center gap-2">
                                {activeTimer?.taskId === task.id ? (
                                <div className="d-flex align-items-center gap-2">
                                  <span className="badge bg-primary py-2 px-3">
                                      ⏱ {formatTime(elapsedSeconds)}
                                  </span>
                                  <button className="btn btn-sm btn-outline-danger" onClick={handleStopTimer}>Stop</button>
                                </div>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-primary" 
                                  onClick={() => handleStartTimer(task.id)}
                                  disabled={!!activeTimer} // Prepreči beleženje dveh nalog hkrati
                                  title={activeTimer ? "Ena naloga že teče!" : ""}
                                >
                                  ▶ Začni beležiti
                                </button>
                                )}
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
                                } catch (err) { alert(`Napaka: ${err.message}`); }
                              }}>Zaključi</button>
                              {isSprintActive && (
                                <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                                  try { await handleRejectTask(task.id, currentUser.id); }
                                  catch (err) { alert(`Napaka: ${err.message}`); }
                                }}>Odpovej</button>
                              )}
                              </div>
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
          try { await handleAcceptTask(task.id, currentUser.id); }
          catch (err) { alert(`Napaka: ${err.message}`); }
        }}>Sprejmi</button>
      )}
      
      {canReject && (
        <button className="btn btn-sm btn-outline-danger" disabled={!currentUser} onClick={async () => {
          try { await handleRejectTask(task.id, currentUser.id); }
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

              <section className="backlog-story-details__section">
                <h3>Opombe</h3>

                {storyComments.length > 0 ? (
                  <ul className="story-comments__list">
                    {storyComments.map(c => (
                      <li key={c.id} className="story-comments__item">
                        <div className="story-comments__meta">
                          <span className="story-comments__author">
                            {c.user?.name && c.user?.surname
                              ? `${c.user.name} ${c.user.surname}`
                              : c.user?.username ?? 'Neznan'}
                          </span>
                          <span className="story-comments__date">
                            {new Date(c.createdAt).toLocaleString('sl-SI')}
                          </span>
                        </div>
                        <p className="story-comments__content">{c.content}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Ni opomb.</p>
                )}

                {isDeveloper && (
                  <form
                    className="story-comments__form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setCommentError('');
                      setCommentSubmitting(true);
                      try {
                        const comment = await addStoryComment(activeStoryForModal.id, newComment);
                        setStoryComments(prev => [...prev, comment]);
                        setNewComment('');
                      } catch (err) {
                        setCommentError(err.message);
                      } finally {
                        setCommentSubmitting(false);
                      }
                    }}
                  >
                    <textarea
                      className="story-comments__textarea"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Dodajte opombo..."
                      rows={3}
                      disabled={commentSubmitting}
                    />
                    {commentError && <p className="story-comments__error">{commentError}</p>}
                    <button
                      type="submit"
                      className="story-comments__submit"
                      disabled={commentSubmitting || !newComment.trim()}
                    >
                      {commentSubmitting ? 'Shranjevanje…' : 'Dodaj opombo'}
                    </button>
                  </form>
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
      {showEditTask && taskToEdit && (
  <div className="modal-overlay" style={{ zIndex: 10002 }} onClick={() => setShowEditTask(false)}>
    <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
      <div className="modal-header-custom d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0 fw-bold">Uredi nalogo</h5>
        <button className="modal-close-btn" onClick={() => setShowEditTask(false)}>✕</button>
      </div>
      <div className="modal-body-custom">
        <TaskForm
          initialData={taskToEdit} // Pošljemo obstoječe podatke
          isEditing={true}         // Povemo formi, da gre za urejanje
          handleUpdateTask={handleEditTaskSubmit} // Pošljemo novo funkcijo
          projectMembers={projectDevelopers}
          onCancel={() => setShowEditTask(false)}
        />
      </div>
    </div>
  </div>
)}
    </div>
    
  );
};

export default SprintPage;
