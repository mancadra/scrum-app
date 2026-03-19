import React, { useEffect } from 'react';
import './BacklogStoryDetailsComponent.css';

const BacklogStoryDetailsComponent = ({ story, onClose, getAcceptanceTests, getStoryPriority }) => {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!story) {
    return null;
  }

  const acceptanceTests = getAcceptanceTests?.(story) ?? [];

  return (
    <div className="backlog-story-details__overlay" onClick={() => onClose?.()}>
      <div
        className="backlog-story-details"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backlog-story-details-title"
      >
        <div className="backlog-story-details__header">
          <div>
            <p className="backlog-story-details__eyebrow">Story details</p>
            <h2 id="backlog-story-details-title">{story.name}</h2>
          </div>

          <button
            type="button"
            className="backlog-story-details__close"
            onClick={() => onClose?.()}
            aria-label="Close story details"
          >
            ✕
          </button>
        </div>

        <div className="backlog-story-details__content">
          <section className="backlog-story-details__section">
            <h3>Overview</h3>
            <div className="backlog-story-details__grid">
              <div>
                <span className="backlog-story-details__label">Description</span>
                <p>{story.description || '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Priority</span>
                <p>{getStoryPriority?.(story) ?? '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Business value</span>
                <p>{story.businessValue ?? '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Time complexity</span>
                <p>{story.timeComplexity != null && story.timeComplexity !== '' ? story.timeComplexity : '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Status</span>
                <p>
                  {story.realized
                    ? 'Realized'
                    : story.sprintId
                      ? 'Assigned'
                      : 'Unassigned'}
                </p>
              </div>

              <div>
                <span className="backlog-story-details__label">Sprint</span>
                <p>{story.sprintId ?? '—'}</p>
              </div>
            </div>
          </section>

          <section className="backlog-story-details__section">
            <h3>Acceptance tests</h3>
            {acceptanceTests.length > 0 ? (
              <ul className="backlog-story-details__list">
                {acceptanceTests.map((test, index) => (
                  <li key={`${test}-${index}`}>{test}</li>
                ))}
              </ul>
            ) : (
              <p>No tests.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default BacklogStoryDetailsComponent;