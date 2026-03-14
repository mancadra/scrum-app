import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';

/**
 * @param {Object} story - Zgodba, ki ji dodajamo nalogo
 * @param {Object} activeSprint - Trenutni aktivni sprint
 * @param {Array} projectMembers - Člani razvojne skupine na projektu
 */
const TaskForm = ({ story, activeSprint, projectMembers, onSuccess }) => {
  const { addTask } = useTasks();
  const [formData, setFormData] = useState({
    description: '',
    estimatedTime: '',
    proposedMemberId: ''
  });
  const [error, setError] = useState('');

  const validate = () => {
    // 1. Preveri za zgodbo izven aktivnega sprinta
    // Predpostavljamo, da story.sprint_id pove, v katerem sprintu je zgodba
    if (!activeSprint || story.sprint_id !== activeSprint.id) {
      return "Naloge lahko dodajate le zgodbam znotraj AKTIVNEGA sprinta.";
    }

    // 2. Preveri za že realizirano zgodbo
    if (story.status === 'DONE' || story.is_realized) {
      return "Ni mogoče dodajati nalog k že realizirani zgodbi.";
    }

    // 3. Preveri za neregularno oceno časa
    const hours = parseFloat(formData.estimatedTime);
    if (isNaN(hours) || hours <= 0 || hours > 100) {
      return "Vnesite realno oceno časa (npr. med 0.5 in 100 urami).";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await addTask({
        story_id: story.id,
        description: formData.description,
        estimated_time: parseFloat(formData.estimatedTime),
        assigned_user_id: formData.proposedMemberId || null,
        status: 'PENDING' // Član mora nalogo še sprejeti
      });
      
      onSuccess(); // Zapre modal ali počisti formo
    } catch (err) {
      setError("Napaka pri komunikaciji s strežnikom.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded">
      <h5>Nova naloga za: {story.title}</h5>
      
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-2">
        <label className="form-label small">Opis naloge</label>
        <textarea 
          className="form-control form-control-sm"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          required
        />
      </div>

      <div className="row">
        <div className="col-md-6 mb-2">
          <label className="form-label small">Ocena (ure)</label>
          <input 
            type="number" 
            step="0.5"
            className="form-control form-control-sm"
            value={formData.estimatedTime}
            onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})}
            required
          />
        </div>

        <div className="col-md-6 mb-2">
          <label className="form-label small">Član ekipe (opcijsko)</label>
          <select 
            className="form-select form-select-sm"
            value={formData.proposedMemberId}
            onChange={(e) => setFormData({...formData, proposedMemberId: e.target.value})}
          >
            <option value="">Izberi člana...</option>
            {projectMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-sm mt-2 w-100">
        Shrani nalogo
      </button>
    </form>
  );
};

export default TaskForm;