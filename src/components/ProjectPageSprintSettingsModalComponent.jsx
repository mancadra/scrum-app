import React, { useEffect, useState } from 'react';
import { deleteSprint, editSprint } from '../services/sprints';
import './ProjectPageSprintComponent.css';
import './ProjectPageSprintSettingsModalComponent.css';

const toDateInputValue = (isoString) => {
    if (!isoString) return '';
    return String(isoString).slice(0, 10); // YYYY-MM-DD
};

const ProjectPageSprintSettingsModalComponent = ({ sprint, sprintNumber, onClose, onSaved, onDeleted }) => {
    const [startingDate, setStartingDate] = useState('');
    const [endingDate, setEndingDate] = useState('');
    const [startingSpeed, setStartingSpeed] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!sprint) return;

        setStartingDate(toDateInputValue(sprint.startingDate));
        setEndingDate(toDateInputValue(sprint.endingDate));
        setStartingSpeed(sprint.startingSpeed != null ? String(sprint.startingSpeed) : '');
        setError('');
        setSuccessMessage('');
    }, [sprint]);

    if (!sprint) return null;

    const handleSave = async (event) => {
        event.preventDefault();

        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            await editSprint(sprint.id, {
                startingDate: startingDate || undefined,
                endingDate: endingDate || undefined,
                startingSpeed: startingSpeed === '' ? undefined : Number(startingSpeed),
            });

            setSuccessMessage('Sprint je bil uspešno posodobljen.');
            if (onSaved) await onSaved();
        } catch (err) {
            setError(err?.message || 'Napaka pri shranjevanju sprinta.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm('Ali res želite izbrisati ta sprint?');
        if (!confirmed) return;

        setDeleting(true);
        setError('');
        setSuccessMessage('');

        try {
            await deleteSprint(sprint.id);
            if (onDeleted) await onDeleted();
            else if (onClose) onClose();
        } catch (err) {
            setError(err?.message || 'Napaka pri brisanju sprinta.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="sprint-settings-modal" role="dialog" aria-modal="true" aria-labelledby="sprint-settings-title">
            <div className="sprint-settings-modal__backdrop" onClick={onClose} />
            <div className="sprint-settings-modal__panel">
                <div className="sprint-settings-modal__header">
                    <h2 id="sprint-settings-title">Nastavitve sprinta #{sprintNumber ?? sprint.id}</h2>
                    <button type="button" className="sprint-settings-modal__close" onClick={onClose} aria-label="Zapri">
                        ×
                    </button>
                </div>

                {error && <div className="sprint-settings-modal__alert sprint-settings-modal__alert--error">{error}</div>}
                {successMessage && (
                    <div className="sprint-settings-modal__alert sprint-settings-modal__alert--success">
                        {successMessage}
                    </div>
                )}

                <form className="sprint-settings-modal__section" onSubmit={handleSave}>
                    <h3>Uredi sprint</h3>

                    <div className="sprint-settings-modal__grid">
                        <label className="sprint-settings-modal__field">
                            <span>Datum začetka</span>
                            <input
                                type="date"
                                value={startingDate}
                                onChange={(e) => setStartingDate(e.target.value)}
                            />
                        </label>

                        <label className="sprint-settings-modal__field">
                            <span>Datum konca</span>
                            <input
                                type="date"
                                value={endingDate}
                                onChange={(e) => setEndingDate(e.target.value)}
                            />
                        </label>
                    </div>

                    <label className="sprint-settings-modal__field">
                        <span>Začetna hitrost</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={startingSpeed}
                            onChange={(e) => setStartingSpeed(e.target.value)}
                            placeholder="Vnesite začetno hitrost"
                        />
                    </label>

                    <div className="sprint-settings-modal__actions">
                        <button type="button" className="sprint-settings-modal__secondary-button" onClick={onClose}>
                            Prekliči
                        </button>
                        <button type="submit" className="project-panel__button" disabled={saving}>
                            {saving ? 'Shranjevanje...' : 'Shrani spremembe'}
                        </button>
                    </div>
                </form>

                <div className="sprint-settings-modal__danger-zone">
                    <div>
                        <h3>Nevarna dejanja</h3>
                        <p className="sprint-settings-modal__note">
                            Brisanje sprinta je trajno in ga ni mogoče razveljaviti.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="sprint-settings-modal__danger-button"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Brišem...' : 'Izbriši sprint'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectPageSprintSettingsModalComponent;
