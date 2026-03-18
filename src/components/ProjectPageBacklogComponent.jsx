import React, { useState } from 'react';
import UserStoryForm from './UserStoryForm';
import BacklogStoryComponent from './BacklogStoryComponent';
import { createUserStory } from '../services/stories';
import './ProjectPageBacklogComponent.css';

const ProjectPageBacklogComponent = ({ project, stories = [], onStoryCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
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

  const getAcceptanceTests = (story) => {
    if (Array.isArray(story.acceptanceTests)) return story.acceptanceTests;
    if (Array.isArray(story.tests)) return story.tests;
    if (typeof story.acceptanceTests === 'string' && story.acceptanceTests.trim()) {
      return story.acceptanceTests
          .split('\n')
          .map((test) => test.trim())
          .filter(Boolean);
    }
    return [];
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
                  <BacklogStoryComponent
                      key={story.id}
                      story={story}
                      onClick={setSelectedStory}
                  />
              ))
          ) : (
              <div className="project-panel__empty">No user stories found for this project.</div>
          )}
        </div>

        {selectedStory && (
            <div className="story-modal-overlay" onClick={() => setSelectedStory(null)}>
              <div className="story-modal" onClick={(e) => e.stopPropagation()}>
                <div className="story-modal__header">
                  <h2>{selectedStory.name}</h2>
                  <button
                      type="button"
                      className="story-modal__close"
                      onClick={() => setSelectedStory(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="story-modal__content">
                  <p><strong>Description:</strong> {selectedStory.description || '—'}</p>

                  <div>
                    <strong>Tests:</strong>
                    <ul>
                      {getAcceptanceTests(selectedStory).length > 0 ? (
                          getAcceptanceTests(selectedStory).map((test, index) => (
                              <li key={`${test}-${index}`}>{test}</li>
                          ))
                      ) : (
                          <li>No tests.</li>
                      )}
                    </ul>
                  </div>

                  <p><strong>Priority:</strong> {selectedStory.priority || '—'}</p>
                  <p><strong>Business value:</strong> {selectedStory.businessValue ?? '—'}</p>

                  {Array.isArray(selectedStory.comments) && selectedStory.comments.length > 0 && (
                      <div>
                        <strong>Comments:</strong>
                        <ul>
                          {selectedStory.comments.map((comment, index) => (
                              <li key={comment.id ?? `${index}-${comment}`}>{comment.text ?? comment}</li>
                          ))}
                        </ul>
                      </div>
                  )}

                  {selectedStory.timeComplexity != null && selectedStory.timeComplexity !== '' && (
                      <p><strong>Time complexity:</strong> {selectedStory.timeComplexity}</p>
                  )}

                  <p><strong>Status:</strong> {selectedStory.realized ? 'Realized' : selectedStory.sprintId ? 'Assigned' : 'Unassigned'}</p>

                  {selectedStory.sprintId && (
                      <p><strong>Sprint:</strong> {selectedStory.sprintId}</p>
                  )}
                </div>
              </div>
            </div>
        )}

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