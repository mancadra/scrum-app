import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { getStoriesForProject, addStoriesToSprint } from '../services/stories';
import { getMyProjectRoles, getProjectUsers } from '../services/projects';
import './SprintPage.css';

const SprintPage = () => {
  const { projectId, sprintId } = useParams();
  
  const { sprintData, loading, fetchSprintBacklog, handleUpdateStoryStatus, handleCreateTask, handleAcceptTask, handleFinishTask } = useTasks(projectId);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showManageStories, setShowManageStories] = useState(false);
  const [backlogStories, setBacklogStories] = useState([]);
  const [selectedStoryForTask, setSelectedStoryForTask] = useState(null);
  const [myProjectRoles, setMyProjectRoles] = useState([]);
  const [projectDevelopers, setProjectDevelopers] = useState([]);

  const handleAddStoryToSprint = async (storyId) => {
  // Vedno poskušaj dobiti ID iz URL-ja ali iz podatkov sprinta
  const activeSprintId = sprintId || sprintData?.sprint?.id;
  
  if (!activeSprintId) {
    alert("Napaka: ID sprinta ni najden.");
    return;
  }

  try {
    // 1. Pokličemo servis za dodajanje
    await addStoriesToSprint(activeSprintId, [storyId]);
    
    // 2. NUJNO: Osvežimo podatke sprinta, da se nova kartica pojavi na kanbanu
    await fetchSprintBacklog(activeSprintId);
    
    // 3. Osvežimo še backlog (seznam v modalu), da dodana zgodba izgine od tam
    await loadBacklog();
    
    alert("Zgodba uspešno dodana v sprint!");
  } catch (err) {
    console.error("Napaka pri dodajanju zgodbe:", err);
    alert(`Napaka: ${err.message}`);
  }
};

  // --- DRAG & DROP ZA USER STORY ---

  const handleDragStart = (e, storyId) => {
    e.dataTransfer.setData("storyId", storyId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const storyId = e.dataTransfer.getData("storyId");
    
    try {
      // Posodobimo status celotne zgodbe
      await handleUpdateStoryStatus(storyId, newStatus);
      fetchSprintBacklog(sprintId);
    } catch (err) {
      alert("Napaka pri premikanju zgodbe: " + err.message);
    }
  };

  // --- MODALI ---

  const openAddTaskModal = (story) => {
    setSelectedStoryForTask(story);
    setShowAddTask(true);
  };

  // Pomožna funkcija za filtriranje zgodb po statusu
  const getStoriesByStatus = (status) => {
  if (!sprintData?.stories) return [];
  
  return sprintData.stories.filter(story => {
    switch (status) {
      case 'unassigned': // Sprint Backlog
        return !story.accepted && !story.realized;
      case 'active':     // Working On
        return story.accepted && !story.realized;
      case 'finished':   // Končano
        return story.realized;
      default:
        return false;
    }
  });
};

  const loadBacklog = async () => {
  try {
    const allStories = await getStoriesForProject(projectId);
    // Filtriramo: zgodba mora biti ocenjena, ne sme biti v trenutnem sprintu 
    // in ne sme biti že zaključena
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
    if (projectId) {
      getMyProjectRoles(projectId)
        .then(setMyProjectRoles)
        .catch(() => setMyProjectRoles([]));

      getProjectUsers(projectId)
        .then(members => {
          const devs = members
            .filter(m => m.ProjectRoles?.projectRole === 'Developer')
            .map(m => ({
              id: m.FK_userId,
              username: m.Users?.username ?? '',
              full_name: [m.Users?.name, m.Users?.surname].filter(Boolean).join(' '),
            }));
          setProjectDevelopers(devs);
        })
        .catch(() => setProjectDevelopers([]));
    }
  }, [projectId]);

  const canAcceptTasks = myProjectRoles.includes('Developer');
  const isActiveSprint = sprintData?.sprint
    ? new Date(sprintData.sprint.startingDate) <= new Date() && new Date(sprintData.sprint.endingDate) >= new Date()
    : false;

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
          <div
            key={status}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <h5 className={`column-header ${status}`}>{STATUS_LABELS[status]}</h5>
            
            <div className="story-list">
              {getStoriesByStatus(status).map(story => (
                <div 
                  key={story.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, story.id)}
                  className="user-story-kanban-card shadow-sm mb-3"
                >
                  {/* Glava User Story kartice */}
                  <div className="story-card-header p-2 d-flex justify-content-between align-items-center">
                    <span className="fw-bold">#{story.id} {story.name}</span>
                    <button 
                        className="btn btn-sm btn-light" 
                        onClick={() => openAddTaskModal(story)}
                        title="Dodaj nalogo tej zgodbi"
                    >+</button>
                  </div>

                  {/* Seznam nalog znotraj User Story-ja */}
                  <div className="story-card-tasks p-2 bg-white">
                    {Object.values(story.tasks || {}).flat().length > 0 ? (
                      Object.values(story.tasks).flat().map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isActiveSprint={isActiveSprint}
                          canAcceptTasks={canAcceptTasks}
                          handleAcceptTask={handleAcceptTask}
                          handleFinishTask={handleFinishTask}
                          projectDevelopers={projectDevelopers}
                          onUpdate={() => fetchSprintBacklog(sprintId)}
                        />
                      ))
                    ) : (
                      <small className="text-muted">Ni nalog</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
        {/* Modal za dodajanje zgodb v sprint */}
{showManageStories && (
  <div className="modal-backdrop show">
    <div className="modal show d-block">
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
                  <button 
                    className="btn btn-sm btn-success" 
                    onClick={() => handleAddStoryToSprint(story.id)}
                  >
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
  <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
    {/* stopPropagation prepreči, da bi se modal zaprl, ko klikneš znotraj njega */}
    <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
      
      <div className="modal-header-custom">
        <h5 className="m-0 fw-bold">Nova naloga</h5>
        <button className="close-modal-btn" onClick={() => setShowAddTask(false)}>&times;</button>
      </div>

      <div className="modal-body-custom">
        <p className="text-muted small mb-3">
          Dodajanje naloge za: <strong>{selectedStoryForTask?.name || "izbrano zgodbo"}</strong>
        </p>
        
        <TaskForm
          handleCreateTask={handleCreateTask}
          stories={sprintData?.stories || []}
          preselectedStoryId={selectedStoryForTask?.id}
          projectMembers={projectDevelopers}
          onSuccess={() => {
            setShowAddTask(false);
            fetchSprintBacklog(sprintId);
          }}
        />
      </div>
      
    </div>
  </div>
)}
    </div>
  );
};

export default SprintPage;