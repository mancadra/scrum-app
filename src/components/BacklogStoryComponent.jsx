import React from 'react';

const BacklogStoryComponent = ({ story, onClick }) => {
  if (!story) return null;

  return (
    <button type="button" className="backlog-story-card" onClick={() => onClick?.(story)}>
      <div className="backlog-story-card__header">
        <h3 className="backlog-story-card__title">{story.name}</h3>
        {story.priority && <span className="backlog-story-card__badge">{story.priority}</span>}
      </div>

      <div className="backlog-story-card__meta">
        {story.timeComplexity != null && story.timeComplexity !== '' && (
          <div className="backlog-story-card__meta-item">
            <strong>Time complexity:</strong> {story.timeComplexity}
          </div>
        )}

        <div className="backlog-story-card__meta-item">
          <strong>Business value:</strong> {story.businessValue ?? '—'}
        </div>

        {story.sprintId && (
          <div className="backlog-story-card__meta-item">
            <strong>Sprint ID:</strong> {story.sprintId}
          </div>
        )}
      </div>
    </button>
  );
};

export default BacklogStoryComponent;