import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStories } from '../hooks/useStories';
import UserStoryForm from '../components/UserStoryForm';
import TaskForm from '../components/TaskForm';
import { getProjectUsers } from '../services/projects';

const ProductBacklogPage = () => {
  const { projectId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTaskStory, setActiveTaskStory] = useState(null); // story for which TaskForm is open
  const [developers, setDevelopers] = useState([]);
  const { stories, addStory, refreshBacklog, loading, error } = useStories(projectId);
  const navigate = useNavigate();

  useEffect(() => {
    getProjectUsers(projectId).then(members => {
      setDevelopers(members.filter(m => m.ProjectRoles?.projectRole === 'Developer').map(m => ({
        id: m.FK_userId,
        full_name: m.Users?.name ? `${m.Users.name} ${m.Users.surname ?? ''}` : m.Users?.username,
      })));
    }).catch(() => {});
  }, [projectId]);

  const goToSprint = () => navigate(`/project/${projectId}/sprint`);

  const categorized = {
    realized: stories?.filter(s => s.category === 'realized') ?? [],
    assigned: stories?.filter(s => s.category === 'assigned') ?? [],
    unassigned: stories?.filter(s => s.category === 'unassigned') ?? [],
  };

  const renderStory = (story) => (
    <div key={story.id} className="border rounded p-3 mb-3 bg-white">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong>{story.name}</strong>
          <span className="ms-2 badge bg-secondary">{story.priority ?? '—'}</span>
        </div>
        <span className="text-muted small">BV: {story.businessValue} {story.timeComplexity ? `| TC: ${story.timeComplexity}` : ''}</span>
      </div>

      {story.Tasks?.length > 0 && (
        <ul className="mt-2 mb-1 ps-3 small">
          {story.Tasks.map(task => (
            <li key={task.id}>
              {task.description} — <em>{task.timecomplexity}h</em>
              {task.finished && <span className="text-success ms-1">✓ done</span>}
              {task.FK_acceptedDeveloper && !task.finished && <span className="text-primary ms-1">• assigned</span>}
            </li>
          ))}
        </ul>
      )}

      {story.category === 'assigned' && (
        <button
          className="btn btn-outline-secondary btn-sm mt-2"
          onClick={() => setActiveTaskStory(story)}
        >
          + Dodaj nalogo
        </button>
      )}
    </div>
  );

  return (
    <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Product Backlog</h1>
        <div className="d-flex gap-2">
          <button onClick={goToSprint} className="btn btn-outline-primary btn-sm">
            Aktivni Sprint →
          </button>
          <button className="btn btn-success btn-sm" onClick={() => setIsSidebarOpen(true)}>
            + Dodaj zgodbo
          </button>
        </div>
      </div>

      <h5>Realizirane</h5>
      {categorized.realized.length === 0 ? <p className="text-muted small">Ni realiziranih zgodb.</p> : categorized.realized.map(renderStory)}

      <h5 className="mt-4">Dodeljene sprintu</h5>
      {categorized.assigned.length === 0 ? <p className="text-muted small">Ni dodeljenih zgodb.</p> : categorized.assigned.map(renderStory)}

      <h5 className="mt-4">Nedodeljene</h5>
      {categorized.unassigned.length === 0 ? <p className="text-muted small">Ni nedodeljenih zgodb.</p> : categorized.unassigned.map(renderStory)}

      {isSidebarOpen && (
        <UserStoryForm
          projectId={projectId}
          onStoryCreated={() => setIsSidebarOpen(false)}
          onClose={() => setIsSidebarOpen(false)}
          addStory={addStory}
          loading={loading}
          error={error}
        />
      )}

      {activeTaskStory && (
        <div className="modal-backdrop-custom" onClick={() => setActiveTaskStory(null)}>
          <div className="modal-dialog-custom" onClick={e => e.stopPropagation()}>
            <TaskForm
              story={activeTaskStory}
              projectMembers={developers}
              onSuccess={async () => { await refreshBacklog(); setActiveTaskStory(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBacklogPage;