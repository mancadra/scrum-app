import React from 'react';
import './ProjectPageSprintComponent.css';

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-GB').format(date);
};

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
                <span className="sprint-card__label">Datum začetka:</span>
                <span>{formatDate(sprint.startingDate)}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Datum konca:</span>
                <span>{formatDate(sprint.endingDate)}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Hitrost:</span>
                <span>{sprint.startingSpeed}</span>
            </div>
        </button>
    );
};

export default BacklogSprintEntryComponent;