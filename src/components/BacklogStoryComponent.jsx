import React from 'react';
import './BacklogStoryComponent.css';

const BacklogStoryComponent = ({
                                   story,
                                   priority,
                                   onClick,
                                   onTimeComplexityClick,
                                   canEditTimeComplexity,
                               }) => {
    if (!story) return null;

    const priorityClassName = {
        ‘Mora biti’: ‘backlog-story-card__badge backlog-story-card__badge--must-have’,
        ‘Bi moralo biti’: ‘backlog-story-card__badge backlog-story-card__badge--should-have’,
        ‘Lahko bi bilo’: ‘backlog-story-card__badge backlog-story-card__badge--could-have’,
        ‘Ne bo tokrat’: ‘backlog-story-card__badge backlog-story-card__badge--wont-have’,
    }[priority] ?? ‘backlog-story-card__badge’;

    return (
        <div className="backlog-story-card">
            <div
                className="backlog-story-card__body"
                role="button"
                tabIndex={0}
                onClick={() => onClick?.(story)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick?.(story);
                    }
                }}
            >
                <div className="backlog-story-card__header">
                    <h3 className="backlog-story-card__title">{story.name}</h3>
                    {priority && <span className={priorityClassName}>{priority}</span>}
                </div>

                <div className="backlog-story-card__meta">
                    {story.timeComplexity != null && story.timeComplexity !== '' && (
                        <div className="backlog-story-card__meta-item">
                            <strong>Časovna zahtevnost:</strong> {story.timeComplexity}
                        </div>
                    )}

                    <div className="backlog-story-card__meta-item">
                        <strong>Poslovna vrednost:</strong> {story.businessValue ?? '—'}
                    </div>

                    {story.sprintId && (
                        <div className="backlog-story-card__meta-item">
                            <strong>Sprint:</strong> {story.sprintId}
                        </div>
                    )}
                </div>

                {canEditTimeComplexity && (
                    <button
                        type="button"
                        className="backlog-story-card__time-button"
                        aria-label={`Nastavi časovno zahtevnost za ${story.name}`}
                        title="Nastavi časovno zahtevnost"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTimeComplexityClick?.(story);
                        }}
                    >
                        ⏰
                    </button>
                )}
            </div>
        </div>
    );
};

export default BacklogStoryComponent;