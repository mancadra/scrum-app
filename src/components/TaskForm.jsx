import React, { useState } from 'react';
import { createTask } from '../services/tasks';

/**
 * @param {Object} story - Zgodba, ki ji dodajamo nalogo
 * @param {Array} projectMembers - Člani razvojne skupine (Developer) na projektu
 * @param {Function} onSuccess - Pokliče se po uspešnem dodajanju naloge
 */
const TaskForm = ({ story, projectMembers, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    estimatedTime: '',
    proposedMemberId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const hours = parseFloat(formData.estimatedTime);
    if (isNaN(hours) || hours <= 0) {
      setError("Vnesite realno oceno časa (npr. 0.5 ali več).");
      return;
    }

    setLoading(true);
    try {
      await createTask(story.id, {
        description: formData.description,
        timecomplexity: hours,
        FK_proposedDeveloper: formData.proposedMemberId || null,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded">
      <h5>Nova naloga za: {story.name}</h5>
      
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

      <button type="submit" disabled={loading} className="btn btn-primary btn-sm mt-2 w-100">
        {loading ? 'Shranjevanje...' : 'Shrani nalogo'}
      </button>
    </form>
  );
};

export default TaskForm;