import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { getProjectUsers } from '../services/projects';
import { supabase } from '../config/supabase';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import './SprintPage.css';

const SprintPage = () => {
  const { projectId, sprintId } = useParams();

  const {
    sprintData,
    loading,
    error,
    fetchSprintBacklog,
    handleCreateTask,
    handleAcceptTask,
    handleFinishTask,
  } = useTasks(projectId);

  const [showAddTask, setShowAddTask] = useState(false);
  const [developers, setDevelopers] = useState([]);
  const [canAcceptTasks, setCanAcceptTasks] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProjectUsers(projectId),
      supabase.auth.getSession(),
    ]).then(([members, { data: { session } }]) => {
      const currentUserId = session?.user?.id;
      const me = members.find(m => m.FK_userId === currentUserId);
      setCanAcceptTasks(me?.ProjectRoles?.projectRole === 'Developer');

      const devs = members
        .filter(m => m.ProjectRoles?.projectRole === 'Developer')
        .map(m => ({
          id: m.FK_userId,
          username: m.Users?.username,
          full_name: [m.Users?.name, m.Users?.surname].filter(Boolean).join(' ') || m.Users?.username,
        }));
      setDevelopers(devs);
    }).catch(() => {
      setDevelopers([]);
      setCanAcceptTasks(false);
    });
  }, [projectId]);

  const now = new Date();
  const sprint = sprintData?.sprint;
  const isActiveSprint = sprint
    ? new Date(sprint.startingDate) <= now && new Date(sprint.endingDate) >= now
    : false;

  const refresh = () => fetchSprintBacklog(sprintId);

  useEffect(() => {
    if (projectId && sprintId) {
      fetchSprintBacklog(sprintId);
    }
  }, [projectId, sprintId, fetchSprintBacklog]);

  if (loading) return <div className="p-5 text-center">Nalagam Sprint Dashboard...</div>;
  
  if (error) return (
    <div className="alert alert-warning m-5">
      <h5>Napaka</h5>
      <p>{error}</p>
      <button className="btn btn-outline-primary" onClick={() => window.history.back()}>Nazaj</button>
    </div>
  );
  
  const getTasksByStatus = (status) => {
    return sprintData?.stories?.flatMap(story => story.tasks[status] || []) || [];
  };

  return (
    <div className="dashboard-container">
      <div className="main-content">
        <div className="header-section d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0">Sprint Board</h2>
            <span className="badge bg-info text-dark">{sprintData?.sprint?.name || 'Aktivni sprint'}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
            + Nova naloga
          </button>
        </div>

        <div className="kanban-board">
          {/* Stolpci uporabljajo getTasksByStatus, ki črpa iz sprintData */}
          <div className="kanban-column">
            <h5 className="column-header">Sprint Backlog</h5>
            <div className="task-list">
              {getTasksByStatus('unassigned').map(task => (
                <TaskCard key={task.id} task={task} isActiveSprint={isActiveSprint} canAcceptTasks={canAcceptTasks} handleAcceptTask={handleAcceptTask} handleFinishTask={handleFinishTask} onUpdate={refresh} />
              ))}
            </div>
          </div>

          <div className="kanban-column">
            <h5 className="column-header">Working On</h5>
            <div className="task-list">
              {[...getTasksByStatus('assigned'), ...getTasksByStatus('active')].map(task => (
                <TaskCard key={task.id} task={task} isActiveSprint={isActiveSprint} canAcceptTasks={canAcceptTasks} handleAcceptTask={handleAcceptTask} handleFinishTask={handleFinishTask} onUpdate={refresh} />
              ))}
            </div>
          </div>

          <div className="kanban-column">
            <h5 className="column-header">Finished</h5>
            <div className="task-list">
              {getTasksByStatus('finished').map(task => (
                <TaskCard key={task.id} task={task} isActiveSprint={isActiveSprint} canAcceptTasks={canAcceptTasks} handleAcceptTask={handleAcceptTask} handleFinishTask={handleFinishTask} onUpdate={refresh} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddTask && (
        <div className="modal-backdrop show">
          <div className="modal show d-block">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Nova naloga</h5>
                  <button className="btn-close" onClick={() => setShowAddTask(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <TaskForm
                    stories={sprintData?.stories}
                    activeSprint={sprintData?.sprint}
                    handleCreateTask={handleCreateTask}
                    projectMembers={developers}
                    onSuccess={() => {
                      setShowAddTask(false);
                      fetchSprintBacklog(sprintId);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintPage;