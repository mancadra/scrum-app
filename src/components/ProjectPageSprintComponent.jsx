import React, { useState } from 'react';
import AddSprintComponent from './AddSprintComponent';
import { createSprint } from '../services/sprints';
import './ProjectPageSprintComponent.css';

const ProjectPageSprintComponent = ({ project, sprints = [], onSprintCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!project) {
    return <div className="project-panel">No project selected.</div>;
  }

  const handleCreateSprint = async ({ title, speed, startDate, endDate }) => {
    setLoading(true);
    setError('');

    try {
      const createdSprint = await createSprint(project.id, {
        startingDate: startDate,
        endingDate: endDate,
        startingSpeed: speed,
      });

      if (onSprintCreated) {
        await onSprintCreated(createdSprint);
      }

      setIsFormOpen(false);
      return createdSprint;
    } catch (err) {
      setError(err.message || 'Failed to create sprint.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-panel project-sprint">
      <div className="project-panel__header">
        <h2>Sprints</h2>
        <button
          type="button"
          className="project-panel__button"
          onClick={() => setIsFormOpen(true)}
        >
          Add Sprint
        </button>
      </div>

      {error && <div className="project-panel__error">{error}</div>}

      <div className="project-panel__list">
        {sprints.length > 0 ? (
          sprints.map((sprint) => (
            <div key={sprint.id} className="project-panel__item">
              <div className="project-panel__item-title">Sprint #{sprint.id}</div>
              <div className="project-panel__item-description">
                {sprint.startingDate} → {sprint.endingDate}
              </div>
              <div className="project-panel__meta">
                Starting speed: {sprint.startingSpeed}
              </div>
            </div>
          ))
        ) : (
          <div className="project-panel__empty">No sprints found for this project.</div>
        )}
      </div>

      {isFormOpen && (
        <AddSprintComponent
          onClose={() => setIsFormOpen(false)}
          onAddSprint={handleCreateSprint}
          loading={loading}
        />
      )}
    </div>
  );
};

export default ProjectPageSprintComponent;