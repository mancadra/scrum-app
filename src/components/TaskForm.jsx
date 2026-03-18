import React, { useState } from 'react';
import './TaskForm.css';

const TaskForm = ({ stories = [], activeSprint, handleCreateTask, projectMembers = [], onSuccess }) => {
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    estimatedTime: '',
    proposedMemberId: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const storyIdNum = parseInt(selectedStoryId);
    const selectedStory = stories.find(s => s.id === storyIdNum);

    if (!selectedStory) {
      setError("Prosimo, izberite User Story.");
      return;
    }

    const hours = parseFloat(formData.estimatedTime);
    if (isNaN(hours) || hours <= 0) {
      setError("Vnesite veljavno oceno časa (več kot 0).");
      return;
    }

    try {
      await handleCreateTask(selectedStory.id, {
        description: formData.description.trim(),
        timecomplexity: hours,
        FK_proposedDeveloper: formData.proposedMemberId || null
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Napaka pri shranjevanju.");
    }
  };

  return (
  <form onSubmit={handleSubmit} className="task-form-container">
    <div className="form-section">
      <label className="form-label-custom">
        <span className="icon">📖</span> Pripada User Story
      </label>
      <select 
        className="form-select-custom"
        value={selectedStoryId}
        onChange={(e) => setSelectedStoryId(e.target.value)}
        required
      >
        <option value="">-- Izberi zgodbo ({stories.length} na voljo) --</option>
        {stories.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>

    {error && <div className="error-badge">{error}</div>}

    <div className="form-section">
      <label className="form-label-custom">
        <span className="icon">📝</span> Opis naloge
      </label>
      <textarea 
        className="form-control-custom"
        rows="4"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        placeholder="Napišite, kaj je potrebno narediti (npr. Implementacija API klica)..."
        required
      />
    </div>

    <div className="form-row-custom">
      <div className="form-section flex-1">
        <label className="form-label-custom">
          <span className="icon">⏱️</span> Ocena (ure)
        </label>
        <input 
          type="number" 
          step="0.5"
          min="0.5"
          className="form-control-custom"
          value={formData.estimatedTime}
          onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})}
          placeholder="npr. 4.5"
          required
        />
      </div>

      <div className="form-section flex-1 ms-3">
        <label className="form-label-custom">
          <span className="icon">👤</span> Razvijalec
        </label>
        <select 
          className="form-select-custom"
          value={formData.proposedMemberId}
          onChange={(e) => setFormData({...formData, proposedMemberId: e.target.value})}
        >
          <option value="">Vsi</option>
          {projectMembers.map(m => (
            <option key={m.id} value={m.id}>{m.full_name || m.username}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="form-actions">
      <button type="submit" className="btn-save-task">
        Ustvari nalogo
      </button>
    </div>
  </form>
);
};

export default TaskForm;