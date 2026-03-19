import React, { useEffect, useState } from 'react';
import UserStoryForm from './UserStoryForm';
import BacklogStoryComponent from './BacklogStoryComponent';
import BacklogStoryDetailsComponent from './BacklogStoryDetailsComponent';
import { createUserStory, setTimeComplexity } from '../services/stories';
import { getCurrentUser } from '../services/auth';
import {
  getRealizedStories,
  getAssignedStories,
  getUnassignedStories,
} from '../services/productBacklog';
import './ProjectPageBacklogComponent.css';

const ProjectPageBacklogComponent = ({ project, projectUsers = [], onStoryCreated }) => {
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
  const [canAddStory, setCanAddStory] = useState(false);
  const [canEditTimeComplexity, setCanEditTimeComplexity] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!project?.id) {
        setCanAddStory(false);
        setCanEditTimeComplexity(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const currentUserId = currentUser?.id;

        const currentMembership = projectUsers.find(
          (membership) => membership.FK_userId === currentUserId
        );

        const role = currentMembership?.ProjectRoles?.projectRole ?? null;

        const nextCanAddStory = role === 'Scrum Master' || role === 'Product Owner';
        const nextCanEditTimeComplexity = role === 'Scrum Master';

        if (!cancelled) {
          setCanAddStory(nextCanAddStory);
          setCanEditTimeComplexity(nextCanEditTimeComplexity);
        }
      } catch {
        if (!cancelled) {
          setCanAddStory(false);
          setCanEditTimeComplexity(false);
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [project?.id, projectUsers]);

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
            canEditTimeComplexity={canEditTimeComplexity}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="project-panel project-backlog">
      <div className="project-panel__header">
        <h2>Backlog</h2>
        {canAddStory && (
          <button
            type="button"
            className="project-panel__button"
            onClick={() => setIsFormOpen(true)}
          >
            Create Story
          </button>
        )}
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
        <BacklogStoryDetailsComponent
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          getAcceptanceTests={getAcceptanceTests}
          getStoryPriority={getStoryPriority}
        />
      )}

      {timeComplexityStory && (
        <div className="story-modal-overlay" onClick={() => setTimeComplexityStory(null)}>
          <div className="story-modal story-modal--compact" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal__header">
              <h2>Set time complexity</h2>
            </div>

            <div className="story-modal__content">
              <p className="story-modal__story"><strong>Story:</strong> {timeComplexityStory.name}</p>

              <label className="story-modal__field">
                <span>Time:</span>
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
                  onClick={() => { setTimeComplexityStory(null); setError(''); }}
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