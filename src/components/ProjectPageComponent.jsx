import React from 'react';
import ProjectPageBacklogComponent from './ProjectPageBacklogComponent';
import ProjectPageSprintComponent from './ProjectPageSprintComponent';
import './ProjectPageComponent.css';

const ProjectPageComponent = ({
                                project,
                                stories = [],
                                sprints = [],
                                projectUsers = [],
                                onStoryCreated,
                                onSprintCreated,
                              }) => {
  if (!project) {
    return <div className="project-page">Ni izbranega projekta.</div>;
  }

  return (
      <div className="project-page">
        {/*<div className="project-page__header" />*/}

        <div className="project-page__columns">
          <ProjectPageBacklogComponent
              project={project}
              projectUsers={projectUsers}
              stories={stories}
              onStoryCreated={onStoryCreated}
          />
          <ProjectPageSprintComponent
              project={project}
              projectUsers={projectUsers}
              sprints={sprints}
              onSprintCreated={onSprintCreated}
          />
        </div>
      </div>
  );
};

export default ProjectPageComponent;