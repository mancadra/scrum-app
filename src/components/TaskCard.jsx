import React from 'react';
import { useTasks } from '../hooks/useTasks';
// Uvoz brez oklepajev, ker useAuth.js uporablja export default
import useAuth from '../hooks/useAuth';

const TaskCard = ({ task, isActiveSprint, onUpdate }) => {
  // Prilagoditev na tvoj useTasks kavelj (funkcije iz servisa)
  const { handleAcceptTask } = useTasks(); 
  const { user } = useAuth();

  const handleAccept = async () => {
    try {
      // Uporabimo tvoj servis acceptTask(taskId)
      await handleAcceptTask(task.id);
      if (onUpdate) onUpdate(); // Osvežimo Sprint Page
      alert("Naloga uspešno sprejeta!");
    } catch (err) {
      alert(err.message || "Naloge ni bilo mogoče sprejeti.");
    }
  };

  // Preverjanje statusov glede na tvoj Tasks servis
  const isFinished = task.finished;
  const isAccepted = !!task.FK_acceptedDeveloper;
  const isProposedToMe = task.FK_proposedDeveloper === user?.id;

  return (
    <div className="card mb-2 shadow-sm border-start border-4" 
         style={{ borderLeftColor: task.FK_proposedDeveloper ? 'orange' : '#ccc' }}>
      <div className="card-body p-3">
        <h6 className="card-title">{task.description}</h6>
        
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="badge bg-secondary">{task.timecomplexity} h</span>
          {isFinished ? (
            <span className="badge bg-success">Zaključeno</span>
          ) : isAccepted ? (
            <span className="badge bg-info text-dark">Dodeljeno</span>
          ) : (
            <span className="badge bg-warning text-dark">Čaka</span>
          )}
        </div>

        {/* Gumbi za interakcijo */}
        {isActiveSprint && !isFinished && !isAccepted && (
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
          </div>
        )}

        {isAccepted && (
          <div className="small text-muted mt-2 border-top pt-2">
            👤 Izvajalec: {task.FK_acceptedDeveloper === user?.id ? 'Vi' : 'Drug razvijalec'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;