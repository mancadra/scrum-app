import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSprintBacklog, acceptTask } from '../services/tasks';
import TaskCard from '../components/TaskCard';

const SprintPage = () => {
  const { projectId } = useParams();
  const [backlog, setBacklog] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSprintBacklog(projectId);
      setBacklog(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) return <div className="p-5 text-center">Nalagam Sprint Backlog...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4 text-center">Sprint: {backlog?.sprint?.name || 'Aktiven Sprint'}</h2>
      
      {backlog?.stories.map(story => (
        <div key={story.id} className="card mb-4 shadow-sm">
          <div className="card-header bg-primary text-white d-flex justify-content-between">
            <h5 className="mb-0">{story.name}</h5>
            <span className="badge bg-light text-dark">Business Value: {story.businessValue}</span>
          </div>
          
          <div className="card-body bg-light">
            <div className="row g-2">
              <div className="col-md-3">
                <h6 className="text-muted text-uppercase small fw-bold">Nedodeljene</h6>
                {story.tasks.unassigned.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={loadData} status="unassigned" />
                ))}
              </div>

          
              <div className="col-md-3">
                <h6 className="text-muted text-uppercase small fw-bold">Dodeljene</h6>
                {story.tasks.assigned.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={loadData} status="assigned" />
                ))}
              </div>

           
              <div className="col-md-3">
                <h6 className="text-muted text-uppercase small fw-bold">Aktivne</h6>
                {story.tasks.active.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={loadData} status="active" />
                ))}
              </div>

              <div className="col-md-3">
                <h6 className="text-muted text-uppercase small fw-bold">Zaključene</h6>
                {story.tasks.finished.map(task => (
                  <TaskCard key={task.id} task={task} onUpdate={loadData} status="finished" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SprintPage;