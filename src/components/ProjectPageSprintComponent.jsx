import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddSprintComponent from './AddSprintComponent';
import BacklogSprintEntryComponent from './BacklogSprintEntryComponent';
import { createSprint } from '../services/sprints';
import { getCurrentUser } from '../services/auth';
import './ProjectPageSprintComponent.css';

const ProjectPageSprintComponent = ({ project, projectUsers = [], sprints = [], onSprintCreated }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canAddSprint, setCanAddSprint] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      if (!project?.id) {
        setCanAddSprint(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const currentUserId = currentUser?.id;

        const userMemberships = projectUsers.filter(m => m.FK_userId === currentUserId);
        const roles = userMemberships.map(m => m.ProjectRoles?.projectRole);

        if (!cancelled) {
          setCanAddSprint(roles.includes('Scrum Master'));
        }
      } catch {
        if (!cancelled) {
          setCanAddSprint(false);
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [project?.id, projectUsers]);

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
    navigate(`/project/${project.id}/sprint/${sprintId}`)
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
              sprints.map((sprint) => (
                  <BacklogSprintEntryComponent
                      key={sprint.id}
                      sprint={sprint}
                      onClick={() => handleSprintClick(sprint.id)}
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
      </div>
  );
};

export default ProjectPageSprintComponent;