import React, { useEffect, useState } from 'react';
import UserStoryForm from './UserStoryForm';
import BacklogStoryComponent from './BacklogStoryComponent';
import BacklogStoryDetailsComponent from './BacklogStoryDetailsComponent';
import { createUserStory, setTimeComplexity, editUserStory, deleteUserStory } from '../services/stories';
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
  const [canManageStories, setCanManageStories] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [storyToDelete, setStoryToDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!project?.id) {
        setCanAddStory(false);
        setCanEditTimeComplexity(false);
        setCanManageStories(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const currentUserId = currentUser?.id;

        const userMemberships = projectUsers.filter(m => m.FK_userId === currentUserId);
        const roles = userMemberships.map(m => m.ProjectRoles?.projectRole);

        const nextCanAddStory = roles.includes('Scrum Master') || roles.includes('Product Owner');
        const nextCanManageStories = roles.includes('Scrum Master') || roles.includes('Product Owner');
        const nextCanEditTimeComplexity = roles.includes('Scrum Master');

        if (!cancelled) {
          setCanAddStory(nextCanAddStory);
          setCanEditTimeComplexity(nextCanEditTimeComplexity);
          setCanManageStories(nextCanManageStories);
        }
      } catch {
        if (!cancelled) {
          setCanAddStory(false);
          setCanEditTimeComplexity(false);
          setCanManageStories(false);
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
        setError(err.message || 'Napaka pri nalaganju zgodb.');
      } finally {
        setPageLoading(false);
      }
    };

    loadStories();
  }, [project?.id]);

  if (!project) {
    return <div className="project-panel">Ni izbranega projekta.</div>;
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

  const validateStoryModifiable = (story) => {
    if (!canManageStories) return "Nimate pravic za urejanje/brisanje zgodb.";
    if (story.realized) return "Zgodba je že realizirana in je ni mogoče spreminjati ali brisati.";
    
    // Preverimo, če je zgodba v seznamu "assigned" (dodeljena sprintu) ali ima eksplicitno nastavljen sprintId
    const isAssigned = assignedStories.some(s => s.id === story.id) || story.sprintId != null;
    if (isAssigned) return "Zgodba je že dodeljena Sprintu in je ni mogoče spreminjati ali brisati.";
    
    return null;
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
      setError(err.message || 'Napaka pri ustvarjanju zgodbe.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStory = async (storyData) => {
    setLoading(true);
    setError('');
    try {
      await editUserStory(editingStory.id, storyData);
      await refreshStories();
      setEditingStory(null);
    } catch (err) {
      setError(err.message || 'Napaka pri posodabljanju zgodbe.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!storyToDelete) return;
    setLoading(true);
    setError('');
    try {
      await deleteUserStory(storyToDelete.id);
      await refreshStories();
      setStoryToDelete(null);
    } catch (err) {
      setError(err.message || 'Napaka pri brisanju zgodbe.');
    } finally {
      setLoading(false);
    }
  };

  const initiateEdit = (story) => {
    const validationError = validateStoryModifiable(story);
    if (validationError) { alert(validationError); return; }
    setEditingStory(story);
  };

  const initiateDelete = (story) => {
    const validationError = validateStoryModifiable(story);
    if (validationError) { alert(validationError); return; }
    setStoryToDelete(story);
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
        throw new Error('Časovna zahtevnost mora biti pozitivno število.');
      }

      await setTimeComplexity(timeComplexityStory.id, parsedValue);
      await refreshStories();
      setTimeComplexityStory(null);
      setTimeComplexityValue('');
    } catch (err) {
      setError(err.message || 'Napaka pri posodobitvi časovne zahtevnosti.');
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
      4: "Won't have this time",
    };

    return priorityMap[Number(rawPriority)] ?? rawPriority ?? '—';
  };

  const renderStories = (stories, emptyMessage, isUnassigned = false) => {
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
            onEdit={isUnassigned && canManageStories ? () => initiateEdit(story) : null}
            onDelete={isUnassigned && canManageStories ? () => initiateDelete(story) : null}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="project-panel project-backlog">
      <div className="project-panel__header">
        <h2>Seznam Zahtev</h2>
        {canAddStory && (
          <button
            type="button"
            className="project-panel__button"
            onClick={() => setIsFormOpen(true)}
          >
            Dodaj Zgodbo
          </button>
        )}
      </div>

      {error && <div className="project-panel__error">{error}</div>}

      {pageLoading ? (
        <div className="project-panel__empty">Nalaganje zahtev...</div>
      ) : (
        <>
          <section className="project-backlog__section">
            <h3>Realizirane Zgodbe</h3>
            {renderStories(realizedStories, 'Ni najdenih zgodb.', false)}
          </section>

          <section className="project-backlog__section">
            <h3>Dodeljene (nerealizirane) Zgodbe</h3>
            {renderStories(assignedStories, 'Ni najdenih zgodb.', false)}
          </section>

          <section className="project-backlog__section">
            <h3>Nedokončane Zgodbe</h3>
            {renderStories(unassignedStories, 'Ni najdenih zgodb.', true)}
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
              <h2>Nastavi zahtevnost</h2>
            </div>

            <div className="story-modal__content">
              <p className="story-modal__story"><strong>Zgodba:</strong> {timeComplexityStory.name}</p>

              <label className="story-modal__field">
                <span>Čas:</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={timeComplexityValue}
                  onChange={(e) => setTimeComplexityValue(e.target.value)}
                  placeholder="npr. 3"
                />
              </label>

              <div className="story-modal__actions">
                <button
                  type="button"
                  className="project-panel__button"
                  onClick={handleSaveTimeComplexity}
                  disabled={savingTimeComplexity}
                >
                  {savingTimeComplexity ? 'Shranjevanje…' : 'Shrani'}
                </button>

                <button
                  type="button"
                  className="story-modal__secondary-button"
                  onClick={() => { setTimeComplexityStory(null); setError(''); }}
                >
                  Prekliči
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

      {editingStory && (
        <UserStoryForm
          projectId={project.id}
          initialData={editingStory} // Predpostavka: UserStoryForm zna prebrati initialData
          addStory={handleUpdateStory}
          loading={loading}
          onClose={() => { setEditingStory(null); setError(''); }}
        />
      )}
      {storyToDelete && (
        <div className="story-modal-overlay" onClick={() => setStoryToDelete(null)}>
          <div className="story-modal story-modal--compact" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal__header">
              <h2>Brisanje zgodbe</h2>
            </div>
            <div className="story-modal__content">
              <p>Ali ste prepričani, da želite izbrisati zgodbo <strong>{storyToDelete.name}</strong>?</p>
              <div className="story-modal__actions mt-4">
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleConfirmDelete} 
                  disabled={loading}
                >
                  {loading ? 'Brisanje...' : 'Izbriši'}
                </button>
                <button 
                  type="button" 
                  className="story-modal__secondary-button btn btn-secondary ms-2" 
                  onClick={() => setStoryToDelete(null)}
                >
                  Prekliči
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPageBacklogComponent;