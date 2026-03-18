import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm'; // Modal za dodajanje

const SprintPage = ({ activeSprint }) => {
  const { tasks } = useTasks();
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);

 const { sprintData, fetchSprintBacklog } = useTasks(projectId);
  const getTaskStyle = (task) => {
    if (task.status === 'PENDING') return { borderLeft: '5px solid orange' };
    return {};
  };

  return (
    <div className="container-fluid mt-4">
      <h2 className="text-center mb-4">Sprint Page</h2>
      
      <div className="row g-3">
        <div className="col-md-4">
          <div className="p-3 bg-light rounded shadow-sm h-100">
            <h5 className="border-bottom pb-2">Sprint Backlog</h5>
            {tasks.filter(t => t.status === 'PENDING').map(task => (
              <div key={task.id} style={getTaskStyle(task)}>
                <TaskCard task={task} isActiveSprint={true} />
              </div>
            ))}
            <button 
              className="btn btn-outline-secondary btn-sm w-100 mt-2"
              onClick={() => setShowAddTask(true)}
            >
              + Add Task (Modal)
            </button>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-3 bg-light rounded shadow-sm h-100">
            <h5 className="border-bottom pb-2">Working On</h5>
            {tasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
              <TaskCard key={task.id} task={task} isActiveSprint={true} />
            ))}
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-3 bg-light rounded shadow-sm h-100">
            <h5 className="border-bottom pb-2">Pending Confirmation</h5>
            {tasks.filter(t => t.status === 'DONE').map(task => (
              <TaskCard key={task.id} task={task} isActiveSprint={true} />
            ))}
          </div>
        </div>
      </div>

      {showAddTask && (
        <div className="modal-backdrop show">
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Dodaj nove naloge (MODAL)</h5>
                  <button className="btn-close" onClick={() => setShowAddTask(false)}></button>
                </div>
                <div className="modal-body">
                  <TaskForm 
                    activeSprint={activeSprint} 
                    onSuccess={() => setShowAddTask(false)} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {sprintData?.stories.map(story => (
  <div key={story.id}>
    <h4>{story.name}</h4>
    <div className="row">
      <div className="col">
        {story.tasks.unassigned.map(task => <TaskCard task={task} />)}
      </div>
      <div className="col">
        {story.tasks.assigned.map(task => <TaskCard task={task} />)}
      </div>
    </div>
  </div>
))}
    </div>
  );
};

export default SprintPage;