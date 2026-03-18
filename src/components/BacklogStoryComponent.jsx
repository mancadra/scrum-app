import React from 'react';
import { Clock3 } from 'lucide-react';

const BacklogStoryComponent = ({ story, priority, onClick, onTimeComplexityClick }) => {
  if (!story) return null;

  return (
    <div className="backlog-story-card" role="presentation">
      <button
        type="button"
        className="backlog-story-card__body"
        onClick={() => onClick?.(story)}
      >
        <div className="backlog-story-card__header">
          <h3 className="backlog-story-card__title">{story.name}</h3>
          {priority && (
            <span className="backlog-story-card__badge">{priority}</span>
          )}
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

      <button
        type="button"
        className="backlog-story-card__time-button"
        aria-label={`Set time complexity for ${story.name}`}
        title="Set time complexity"
        onClick={(e) => {
          e.stopPropagation();
          onTimeComplexityClick?.(story);
        }}
      >
        ⏰
      </button>
    </div>
  );
};

export default BacklogStoryComponent;