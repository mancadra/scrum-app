import React from 'react';
import './ProjectPageSprintComponent.css';

const formatDate = (value) => {
    if (!value) return '—';

    const datePart = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return value;

    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year}`;
};

const BacklogSprintEntryComponent = ({ sprint, sprintNumber, onClick, onSettingsClick, canOpenSettings = false }) => {
    if (!sprint) {
        return null;
    }

    return (
        <div className="sprint-card__wrapper">
            <div
                className="sprint-card"
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onClick();
                    }
                }}
            >
                {canOpenSettings && (
                    <button
                        type="button"
                        className="sprint-card__settings-button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSettingsClick();
                        }}
                        aria-label={`Odpri nastavitve za Sprint #${sprintNumber ?? sprint.id}`}
                        title="Nastavitve sprinta"
                    >
                        ⚙
                    </button>
                )}

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
            </div>
        </div>
    );
};

export default BacklogSprintEntryComponent;