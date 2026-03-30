import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import './TaskCard.css';

const TaskCard = ({ task, isActiveSprint, canAcceptTasks, handleAcceptTask, handleFinishTask, projectDevelopers = [], onUpdate }) => {
  const { user } = useAuth();
  const [acceptError, setAcceptError] = useState('');
  const [finishError, setFinishError] = useState('');

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
      await handleFinishTask(task.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      setFinishError(err.message || 'Naloge ni bilo mogoče zaključiti.');
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
            👤 Izvajalec: {(() => {
              const dev = projectDevelopers.find(d => d.id === task.FK_acceptedDeveloper);
              return dev ? (dev.full_name || dev.username) : 'Drug razvijalec';
            })()}
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
    </div>
  );
};

export default TaskCard;