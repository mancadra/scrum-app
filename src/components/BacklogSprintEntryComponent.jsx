import React from 'react';
import './ProjectPageSprintComponent.css';

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
};

const BacklogSprintEntryComponent = ({ sprint, sprintNumber, onClick }) => {
    if (!sprint) {
        return null;
    }

    return (
        <button
            type="button"
            className="sprint-card"
            onClick={onClick}
        >
            <div className="sprint-card__title">Sprint #{sprintNumber ?? sprint.id}</div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Datum začetka:</span>
                <span>{formatDate(sprint.startingDate)}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Datum konca:</span>
                <span>{formatDate(sprint.endingDate)}</span>
            </div>
            <div className="sprint-card__row">
                <span className="sprint-card__label">Časovna zahtevnost:</span>
                <span>{sprint.startingSpeed}</span>
            </div>
        </button>
    );
};

export default BacklogSprintEntryComponent;