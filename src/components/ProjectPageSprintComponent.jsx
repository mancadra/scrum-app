import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddSprintComponent from './AddSprintComponent';
import BacklogSprintEntryComponent from './BacklogSprintEntryComponent';
import ProjectPageSprintSettingsModalComponent from './ProjectPageSprintSettingsModalComponent';
import { createSprint } from '../services/sprints';
import { getCurrentUser } from '../services/auth';
import './ProjectPageSprintComponent.css';

const ProjectPageSprintComponent = ({ project, projectUsers = [], sprints = [], onSprintCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canAddSprint, setCanAddSprint] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedSprint, setSelectedSprint] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!project?.id) {
        setCanAddSprint(false);
        setCurrentUserId('');
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const currentUserIdValue = currentUser?.id;
        const userMemberships = projectUsers.filter((m) => m.FK_userId === currentUserIdValue);
        const roles = userMemberships.map((m) => m.ProjectRoles?.projectRole);

        if (!cancelled) {
          setCurrentUserId(currentUserIdValue || '');
          setCanAddSprint(roles.includes('Scrum Master'));
        }
      } catch {
        if (!cancelled) {
          setCanAddSprint(false);
          setCurrentUserId('');
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [project?.id, projectUsers]);

  const canOpenSprintSettings = useMemo(() => {
    return (sprint) => {
      if (!canAddSprint || !sprint?.startingDate) return false;
      const startDate = new Date(sprint.startingDate);
      if (Number.isNaN(startDate.getTime())) return false;
      return new Date() < startDate;
    };
  }, [canAddSprint]);

  if (!project) {
    return <div className="project-panel">Ni izbranega projekta.</div>;
  }

  const handleCreateSprint = async ({ speed, startDate, endDate }) => {
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
      setError(err.message || 'Napaka pri ustvarjanju sprinta.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSprintClick = (sprintId) => {
    navigate(`/project/${project.id}/sprint/${sprintId}`);
  };

  return (
      <div className="project-panel project-sprint">
        <div className="project-panel__header">
          <h2>Sprinti</h2>
          {canAddSprint && (
            <button
                type="button"
                className="project-panel__button"
                onClick={() => setIsFormOpen(true)}
            >
              Dodaj Sprint
            </button>
          )}
        </div>

        {error && <div className="project-panel__error">{error}</div>}

        <div className="project-panel__list">
          {sprints.length > 0 ? (
              [...sprints]
                  .sort((a, b) => new Date(a.startingDate) - new Date(b.startingDate))
                  .map((sprint, index) => (
                      <BacklogSprintEntryComponent
                          key={sprint.id}
                          sprint={sprint}
                          sprintNumber={index + 1}
                          onClick={() => handleSprintClick(sprint.id)}
                          canOpenSettings={canOpenSprintSettings(sprint)}
                          onSettingsClick={() => setSelectedSprint({ sprint, sprintNumber: index + 1 })}
                      />
                  ))
          ) : (
              <div className="project-panel__empty">Ni najdenih sprintov za izbran projekt.</div>
          )}
        </div>

        {isFormOpen && (
            <AddSprintComponent
                onClose={() => { setIsFormOpen(false); setError(''); }}
                onAddSprint={handleCreateSprint}
                loading={loading}
                error={error}
            />
        )}

        {selectedSprint && (
            <ProjectPageSprintSettingsModalComponent
                sprint={selectedSprint.sprint}
                sprintNumber={selectedSprint.sprintNumber}
                onClose={() => setSelectedSprint(null)}
                onSaved={async () => {
                    setSelectedSprint(null);
                    if (onSprintCreated) {
                        await onSprintCreated();
                    }
                }}
                onDeleted={async () => {
                    setSelectedSprint(null);
                    if (onSprintCreated) {
                        await onSprintCreated();
                    }
                }}
            />
        )}
      </div>
  );
};

export default ProjectPageSprintComponent;