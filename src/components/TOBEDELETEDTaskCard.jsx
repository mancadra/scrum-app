import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { getTaskLoggedHours } from '../services/tasks';
import './TOBEDELETEDTaskCard.css';

console.log('THE FILE TaskCard.jsx WAS RUN, WE EXPECT TO DELETE IT');

const TOBEDELETEDTaskCard = ({ task, isActiveSprint, canAcceptTasks, handleAcceptTask, handleFinishTask, handleReopenTask, onUpdate }) => {
  const { user } = useAuth();
  const [acceptError, setAcceptError] = useState('');
  const [finishError, setFinishError] = useState('');
  const [reopenError, setReopenError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingLoggedHours, setPendingLoggedHours] = useState(0);

  const handleAccept = async () => {
    setAcceptError('');
    try {
      await handleAcceptTask(task.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      setAcceptError(err.message || 'Naloge ni bilo mogoče sprejeti.');
    }
  };

  const handleFinish = async () => {
    setFinishError('');
    try {
      const hours = await getTaskLoggedHours(task.id);
      if (hours === 0) {
        setFinishError('Za zaključitev naloge morajo biti zabeležene ure dela.');
        return;
      }
      if (task.timecomplexity && hours < task.timecomplexity) {
        setPendingLoggedHours(hours);
        setShowConfirm(true);
        return;
      }
      await handleFinishTask(task.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      setFinishError(err.message || 'Naloge ni bilo mogoče zaključiti.');
    }
  };

  const confirmFinish = async () => {
    setShowConfirm(false);
    setFinishError('');
    try {
      await handleFinishTask(task.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      setFinishError(err.message || 'Naloge ni bilo mogoče zaključiti.');
    }
  };

  const handleReopen = async () => {
    setReopenError('');
    try {
      await handleReopenTask(task.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      setReopenError(err.message || 'Naloge ni bilo mogoče znova odpreti.');
    }
  };

  // Preverjanje statusov glede na tvoj Tasks servis
  const isFinished = task.finished;
  const isAccepted = !!task.FK_acceptedDeveloper;
  const isProposedToMe = task.FK_proposedDeveloper === user?.id;

  return (
    <div className="task-card-item">
        <h6 className="card-title">{task.description}</h6>

        <div className="task-card-badges">
          <span className="badge bg-secondary">{task.timecomplexity} h</span>
          {isFinished ? (
            <span className="badge bg-success">Zaključeno</span>
          ) : isAccepted ? (
            <span className="badge bg-info text-dark">Dodeljeno</span>
          ) : (
            <span className="badge bg-warning text-dark">Nedodeljeno</span>
          )}
        </div>

        {/* Gumbi za interakcijo */}
        {isActiveSprint && !isFinished && !isAccepted && !canAcceptTasks && (
          <small className="text-muted d-block text-center mt-3">
            Samo razvijalci lahko sprejmejo nalogo
          </small>
        )}

        {isActiveSprint && !isFinished && !isAccepted && canAcceptTasks && (
          <div className="mt-3">
            {(!task.FK_proposedDeveloper || isProposedToMe) ? (
              <button
                onClick={handleAccept}
                className="btn btn-sm btn-primary w-100"
              >
                Sprejmi nalogo
              </button>
            ) : (
              <small className="text-muted d-block text-center italic">
                Predlagano drugemu razvijalcu
              </small>
            )}
            {acceptError && <p className="error-badge mt-2">{acceptError}</p>}
          </div>
        )}

        {isAccepted && (
          <div className="small text-muted mt-2 border-top pt-2">
            👤 Izvajalec: {task.FK_acceptedDeveloper === user?.id ? 'Vi' : 'Drug razvijalec'}
          </div>
        )}

        {isActiveSprint && isAccepted && !isFinished && task.FK_acceptedDeveloper === user?.id && (
          <div className="mt-2">
            <button onClick={handleFinish} className="btn btn-sm btn-success w-100">
              Zaključi nalogo
            </button>
            {finishError && <p className="error-badge mt-2">{finishError}</p>}
          </div>
        )}

        {isActiveSprint && isFinished && task.FK_acceptedDeveloper === user?.id && (
          <div className="mt-2">
            <button onClick={handleReopen} className="btn btn-sm btn-outline-secondary w-100">
              Znova odpri
            </button>
            {reopenError && <p className="error-badge mt-2">{reopenError}</p>}
          </div>
        )}

        {showConfirm && (
          <div className="task-card-modal-overlay" style={{ zIndex: 10100 }} onClick={() => setShowConfirm(false)}>
            <div className="task-card-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="task-card-modal-header">
                <h5 className="m-0 fw-bold">Zaključitev naloge</h5>
                <button className="modal-close-btn" onClick={() => setShowConfirm(false)}>✕</button>
              </div>
              <div className="task-card-modal-body">
                <p className="text-muted small mb-3">
                  Niste zabeležili vseh ocenjenih ur.<br />
                  Zabeleženo: <strong>{pendingLoggedHours} h</strong> / Ocenjeno: <strong>{task.timecomplexity} h</strong><br /><br />
                  Ali ste prepričani, da želite zaključiti nalogo?
                </p>
                <div className="d-flex gap-2 justify-content-end">
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowConfirm(false)}>Prekliči</button>
                  <button className="btn btn-sm btn-success" onClick={confirmFinish}>Zaključi vseeno</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default TOBEDELETEDTaskCard;