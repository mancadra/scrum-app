import React, { useEffect, useState } from 'react';
import ProjectPageBacklogComponent from './ProjectPageBacklogComponent';
import ProjectPageSprintComponent from './ProjectPageSprintComponent';
import ProjectPageWallComponent from './ProjectPageWallComponent';
import ProjectapageDocumentationComponent from './ProjectPageDocumentationComponent';
import ProjectPageSettingsModalComponent from './ProjectPageSettingsModalComponent';
import { getCurrentUser } from '../services/auth';
import { getProjectRolesForUser } from '../services/tasks';
import './ProjectPageComponent.css';

const ProjectPageComponent = ({
  project,
  stories = [],
  sprints = [],
  projectUsers = [],
  onStoryCreated,
  onSprintCreated,
  onProjectUpdated,
}) => {
  const [canManageProject, setCanManageProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWall, setShowWall] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [backlogRefreshKey, setBacklogRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (!project?.id) {
        setCanManageProject(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const isAdmin = currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false;
        const roles = await getProjectRolesForUser(project.id, currentUser?.id);

        if (!cancelled) {
          setCanManageProject(isAdmin || roles.includes('Scrum Master'));
        }
      } catch {
        if (!cancelled) setCanManageProject(false);
      }
    }

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  if (!project) {
    return <div className="project-page">Ni izbranega projekta.</div>;
  }

  return (
    <div className="project-page">
      {showDocumentation ? (
        <ProjectapageDocumentationComponent
          project={project}
          onBackToProject={() => setShowDocumentation(false)}
        />
      ) : showWall ? (
        <ProjectPageWallComponent
          project={project}
        />
      ) : (
        <div className="project-page__columns">
          <ProjectPageBacklogComponent
            project={project}
            projectUsers={projectUsers}
            stories={stories}
            onStoryCreated={onStoryCreated}
            refreshKey={backlogRefreshKey}
          />
          <ProjectPageSprintComponent
            project={project}
            projectUsers={projectUsers}
            sprints={sprints}
            onSprintCreated={async () => {
              setBacklogRefreshKey(k => k + 1);
              if (onSprintCreated) await onSprintCreated();
            }}
          />
        </div>
      )}

      {(canManageProject || true) && (
          <div className="project-page__footer">
            <button
                type="button"
                className="project-panel__button project-page__footer-button project-page__wall-toggle-button"
                onClick={() => {
                  setShowDocumentation(false);
                  setShowWall((prev) => !prev);
                }}
            >
              {showWall ? 'POKAŽI PROJEKT' : 'POKAŽI ZID'}
            </button>

            <button
                type="button"
                className="project-panel__button project-page__footer-button"
                onClick={() => {
                  setShowWall(false);
                  setShowDocumentation((prev) => !prev);
                }}
            >
              {showDocumentation ? 'POKAŽI PROJEKT' : 'DOKUMENTACIJA'}
            </button>

            {canManageProject && (
                <button
                    type="button"
                    className="project-panel__button project-page__footer-button project-page__settings-button"
                    onClick={() => setShowSettings(true)}
                >
                  NASTAVITVE PROJEKTA
                </button>
            )}
          </div>
      )}

      {showSettings && (
        <ProjectPageSettingsModalComponent
          project={project}
          projectUsers={projectUsers}
          onClose={() => setShowSettings(false)}
          onSaved={async () => {
            setShowSettings(false);
            if (onProjectUpdated) await onProjectUpdated();
          }}
        />
      )}
    </div>
  );
};

export default ProjectPageComponent;