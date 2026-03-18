import React, { useState } from 'react';
import UserStoryForm from './UserStoryForm';
import { createUserStory } from '../services/stories';
import './ProjectPageBacklogComponent.css';

const ProjectPageBacklogComponent = ({ project, stories = [], onStoryCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!project) {
    return <div className="project-panel">No project selected.</div>;
  }

  const handleCreateStory = async (storyData) => {
    setLoading(true);
    setError('');

    try {
      const createdStory = await createUserStory(project.id, storyData);
      if (onStoryCreated) {
        await onStoryCreated(createdStory);
      }
      setIsFormOpen(false);
      return createdStory;
    } catch (err) {
      setError(err.message || 'Failed to create story.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-panel project-backlog">
      <div className="project-panel__header">
        <h2>Backlog</h2>
        <button
          type="button"
          className="project-panel__button"
          onClick={() => setIsFormOpen(true)}
        >
          Create Story
        </button>
      </div>

      {error && <div className="project-panel__error">{error}</div>}

      <div className="project-panel__list">
        {stories.length > 0 ? (
          stories.map((story) => (
            <div key={story.id} className="project-panel__item">
              <div className="project-panel__item-title">{story.name}</div>
              <div className="project-panel__item-description">{story.description}</div>
            </div>
          ))
        ) : (
          <div className="project-panel__empty">No user stories found for this project.</div>
        )}
      </div>

      {isFormOpen && (
        <UserStoryForm
          projectId={project.id}
          addStory={handleCreateStory}
          loading={loading}
          error={error}
          onStoryCreated={() => setIsFormOpen(false)}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectPageBacklogComponent;