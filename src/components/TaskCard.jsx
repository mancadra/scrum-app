import React from 'react';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';

const TaskCard = ({ task, isActiveSprint }) => {
  const { updateTaskStatus } = useTasks();
  const { user } = useAuth(); 

  const handleAccept = async () => {
    try {
      await updateTaskStatus(task.id, user.id, 'ASSIGNED');
      alert("Naloga uspešno sprejeta!");
    } catch (err) {
      alert("Naloge ni bilo mogoče sprejeti.");
    }
  };

  const handleReject = async () => {
    try {
      await updateTaskStatus(task.id, null, 'PENDING');
      alert("Naloga je bila zavrnjena in je spet na voljo vsem.");
    } catch (err) {
      alert("Napaka pri zavračanju.");
    }
  };

  // Preverimo, če je naloga še prosta (brez potrjenega lastnika)
  const isPending = task.status === 'PENDING' || !task.assigned_user_id;
  
  // Preverimo, če je trenutni uporabnik tisti, ki mu je bila naloga predlagana
  const isProposedToMe = task.assigned_user_id === user.id && task.status === 'PENDING';

  return (
    <div className="card mb-2 shadow-sm">
      <div className="card-body p-3">
        <h6 className="card-title">{task.description}</h6>
        <p className="card-text mb-2">
          <span className="badge bg-secondary">{task.estimated_time} h</span>
          <span className={`ms-2 badge ${task.status === 'ASSIGNED' ? 'bg-success' : 'bg-warning'}`}>
            {task.status}
          </span>
        </p>

        {isActiveSprint && (isPending || isProposedToMe) && (
          <div className="d-flex gap-2 mt-3">
            <button 
              onClick={handleAccept} 
              className="btn btn-sm btn-success flex-grow-1"
            >
              Sprejmi (Accept)
            </button>
            
            {isProposedToMe && (
              <button 
                onClick={handleReject} 
                className="btn btn-sm btn-outline-danger"
              >
                Zavrni (Reject)
              </button>
            )}
          </div>
        )}

        {task.status === 'ASSIGNED' && (
          <div className="small text-muted mt-2">
            👤 Dodeljeno: {task.assigned_user_name || 'Neznan član'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;