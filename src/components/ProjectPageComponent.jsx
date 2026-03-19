import React from 'react';
import ProjectPageBacklogComponent from './ProjectPageBacklogComponent';
import ProjectPageSprintComponent from './ProjectPageSprintComponent';
import './ProjectPageComponent.css';

const ProjectPageComponent = ({
  project,
  stories = [],
  sprints = [],
  onStoryCreated,
  onSprintCreated,
}) => {
  if (!project) {
    return <div className="project-page">No project selected.</div>;
  }

  return (
    <div className="project-page">
      <div className="project-page__header" />

      <div className="project-page__columns">
        <ProjectPageBacklogComponent
          project={project}
          stories={stories}
          onStoryCreated={onStoryCreated}
        />
        <ProjectPageSprintComponent
          project={project}
          sprints={sprints}
          onSprintCreated={onSprintCreated}
        />
      </div>
    </div>
  );
};

export default ProjectPageComponent;