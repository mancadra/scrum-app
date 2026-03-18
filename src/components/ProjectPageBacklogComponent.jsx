import React, { useEffect, useState } from 'react';
import UserStoryForm from './UserStoryForm';
import BacklogStoryComponent from './BacklogStoryComponent';
import { createUserStory, setTimeComplexity } from '../services/stories';
import {
  getRealizedStories,
  getAssignedStories,
  getUnassignedStories,
} from '../services/productBacklog';
import './ProjectPageBacklogComponent.css';

const ProjectPageBacklogComponent = ({ project, onStoryCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [timeComplexityStory, setTimeComplexityStory] = useState(null);
  const [timeComplexityValue, setTimeComplexityValue] = useState('');
  const [savingTimeComplexity, setSavingTimeComplexity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [realizedStories, setRealizedStories] = useState([]);
  const [assignedStories, setAssignedStories] = useState([]);
  const [unassignedStories, setUnassignedStories] = useState([]);

  useEffect(() => {
    if (!project?.id) {
      setRealizedStories([]);
      setAssignedStories([]);
      setUnassignedStories([]);
      setPageLoading(false);
      return;
    }

    const loadStories = async () => {
      setPageLoading(true);
      setError('');

      try {
        const [realizedData, assignedData, unassignedData] = await Promise.all([
          getRealizedStories(project.id),
          getAssignedStories(project.id),
          getUnassignedStories(project.id),
        ]);

        setRealizedStories(realizedData ?? []);
        setAssignedStories(assignedData ?? []);
        setUnassignedStories(unassignedData ?? []);
      } catch (err) {
        setError(err.message || 'Failed to load backlog stories.');
      } finally {
        setPageLoading(false);
      }
    };

    loadStories();
  }, [project?.id]);

  if (!project) {
    return <div className="project-panel">No project selected.</div>;
  }

  const refreshStories = async () => {
    const [realizedData, assignedData, unassignedData] = await Promise.all([
      getRealizedStories(project.id),
      getAssignedStories(project.id),
      getUnassignedStories(project.id),
    ]);

    setRealizedStories(realizedData ?? []);
    setAssignedStories(assignedData ?? []);
    setUnassignedStories(unassignedData ?? []);
  };

  const handleCreateStory = async (storyData) => {
    setLoading(true);
    setError('');

    try {
      const createdStory = await createUserStory(project.id, storyData);
      if (onStoryCreated) {
        await onStoryCreated(createdStory);
      }

      await refreshStories();
      setIsFormOpen(false);
      return createdStory;
    } catch (err) {
      setError(err.message || 'Failed to create story.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTimeComplexityModal = (story) => {
    setTimeComplexityStory(story);
    setTimeComplexityValue(story?.timeComplexity?.toString?.() ?? '');
    setError('');
  };

  const handleSaveTimeComplexity = async () => {
    if (!timeComplexityStory?.id) return;

    setSavingTimeComplexity(true);
    setError('');

    try {
      const parsedValue = Number(timeComplexityValue);

      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        throw new Error('Time complexity must be a positive number.');
      }

      await setTimeComplexity(timeComplexityStory.id, parsedValue);
      await refreshStories();
      setTimeComplexityStory(null);
      setTimeComplexityValue('');
    } catch (err) {
      setError(err.message || 'Failed to update time complexity.');
    } finally {
      setSavingTimeComplexity(false);
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

  const getStoryPriority = (story) => {
    const rawPriority = story.priority ?? story.Priorities?.priority ?? story.FK_priorityId;

    const priorityMap = {
      1: 'Must have',
      2: 'Should have',
      3: 'Could have',
      4: 'Won’t have this time',
    };

    return priorityMap[Number(rawPriority)] ?? rawPriority ?? '—';
  };

  const renderStories = (stories, emptyMessage) => {
    if (!stories || stories.length === 0) {
      return <div className="project-panel__empty">{emptyMessage}</div>;
    }

    return (
      <div className="project-panel__list">
        {stories.map((story) => (
          <BacklogStoryComponent
            key={story.id}
            story={story}
            priority={getStoryPriority(story)}
            onClick={setSelectedStory}
            onTimeComplexityClick={handleOpenTimeComplexityModal}
          />
        ))}
      </div>
    );
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

      {pageLoading ? (
        <div className="project-panel__empty">Loading backlog...</div>
      ) : (
        <>
          <section className="project-backlog__section">
            <h3>Realized stories</h3>
            {renderStories(realizedStories, 'No realized stories found.')}
          </section>

          <section className="project-backlog__section">
            <h3>Assigned (but not realized) stories</h3>
            {renderStories(assignedStories, 'No assigned stories found.')}
          </section>

          <section className="project-backlog__section">
            <h3>Unassigned (and not realized) stories</h3>
            {renderStories(unassignedStories, 'No unassigned stories found.')}
          </section>
        </>
      )}

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

              <p><strong>Priority:</strong> {getStoryPriority(selectedStory)}</p>
              <p><strong>Business value:</strong> {selectedStory.businessValue ?? '—'}</p>

              {selectedStory.timeComplexity != null && selectedStory.timeComplexity !== '' && (
                <p><strong>Time complexity:</strong> {selectedStory.timeComplexity}</p>
              )}

              <p>
                <strong>Status:</strong>{' '}
                {selectedStory.realized
                  ? 'Realized'
                  : selectedStory.sprintId
                    ? 'Assigned'
                    : 'Unassigned'}
              </p>

              {selectedStory.sprintId && (
                <p><strong>Sprint:</strong> {selectedStory.sprintId}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {timeComplexityStory && (
        <div className="story-modal-overlay" onClick={() => setTimeComplexityStory(null)}>
          <div className="story-modal story-modal--compact" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal__header">
              <h2>Set time complexity</h2>
              <button
                type="button"
                className="story-modal__close"
                onClick={() => setTimeComplexityStory(null)}
              >
                ✕
              </button>
            </div>

            <div className="story-modal__content">
              <p><strong>Story:</strong> {timeComplexityStory.name}</p>

              <label className="story-modal__field">
                <span>Time complexity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={timeComplexityValue}
                  onChange={(e) => setTimeComplexityValue(e.target.value)}
                  placeholder="e.g. 3"
                />
              </label>

              <div className="story-modal__actions">
                <button
                  type="button"
                  className="project-panel__button"
                  onClick={handleSaveTimeComplexity}
                  disabled={savingTimeComplexity}
                >
                  {savingTimeComplexity ? 'Saving…' : 'Save'}
                </button>

                <button
                  type="button"
                  className="story-modal__secondary-button"
                  onClick={() => setTimeComplexityStory(null)}
                >
                  Cancel
                </button>
              </div>
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