import React from 'react';
import './ProjectPageSprintComponent.css';

const BacklogSprintEntryComponent = ({ sprint, onClick }) => {
    if (!sprint) {
        return null;
    }

    return (
        <button
            type="button"
            className="sprint-card"
            onClick={onClick}
        >
            <div className="sprint-card__title">Sprint #{sprint.id}</div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Start date:</span>
                <span>{sprint.startingDate}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">End date:</span>
                <span>{sprint.endingDate}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Velocity:</span>
                <span>{sprint.startingSpeed}</span>
            </div>
        </button>
    );
};

export default BacklogSprintEntryComponent;