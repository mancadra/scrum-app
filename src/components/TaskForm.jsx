import React, { useState, useEffect } from 'react';
import './TaskForm.css';

const TaskForm = ({ 
  stories = [], 
  handleCreateTask, 
  projectMembers = [], 
  onSuccess, 
  preselectedStoryId,
  handleUpdateTask, 
  initialData, 
  isEditing,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    estimatedTime: '',
    proposedMemberId: ''
  });
  const [error, setError] = useState('');

  // 1. Logika za polnjenje forme ob urejanju ali preizbiri zgodbe
  useEffect(() => {
    if (isEditing && initialData) {
      // Polnjenje za UREJANJE
      setSelectedStoryId(initialData.FK_userStoryId?.toString() || '');
      setFormData({
        description: initialData.description || '',
        estimatedTime: initialData.timecomplexity || '',
        proposedMemberId: initialData.FK_proposedDeveloper || ''
      });
    } else if (preselectedStoryId) {
      // Polnjenje za NOVO nalogo iz specifične zgodbe
      setSelectedStoryId(preselectedStoryId.toString());
    }
  }, [preselectedStoryId, initialData, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const storyIdNum = parseInt(selectedStoryId);
    if (!storyIdNum) {
      setError("Prosimo, izberite uporabniško zgodbo.");
      return;
    }

    const hours = parseFloat(formData.estimatedTime);
    if (isNaN(hours) || hours <= 0) {
      setError("Vnesite veljavno oceno v točkah (npr. 2.5).");
      return;
    }

    try {
      const payload = {
        description: formData.description.trim(),
        timecomplexity: hours,
        FK_proposedDeveloper: formData.proposedMemberId || null
      };

      if (isEditing) {
        // 2. Klic za POSODABLJANJE (tvoj backend editTask)
        await handleUpdateTask(initialData.id, payload);
      } else {
        // 3. Klic za USTVARJANJE
        await handleCreateTask(storyIdNum, payload);
      }
      
      onSuccess(); 
    } catch (err) {
      console.error("Napaka pri shranjevanju naloge:", err);
      setError(err.message || "Napaka pri shranjevanju.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form-container">
      {/* Pri urejanju lahko onemogočimo izbiro zgodbe, če ne želiš, da se naloge selijo med zgodbami */}
      <div className="form-section">
        <label className="form-label-custom">
          <span className="icon">📖</span> Pripada User Story
        </label>
        <select 
          className="form-select-custom"
          value={selectedStoryId}
          onChange={(e) => setSelectedStoryId(e.target.value)}
          disabled={isEditing} 
          required
        >
          <option value="">-- Izberi zgodbo --</option>
          {stories.map(s => (
            <option key={s.id} value={s.id}>#{s.id} - {s.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-badge mb-3">{error}</div>}

      <div className="form-section">
        <label className="form-label-custom">
          <span className="icon">📝</span> Opis naloge
        </label>
        <textarea 
          className="form-control-custom"
          rows="3"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Kaj je potrebno narediti..."
          required
        />
      </div>

      <div className="form-row-custom d-flex gap-3">
        <div className="form-section flex-fill">
          <label className="form-label-custom">
            <span className="icon">⏱️</span> Zahtevnost (točke)
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

        <div className="form-section flex-fill">
          <label className="form-label-custom">
            <span className="icon">👤</span> Razvijalec
          </label>
          <select 
            className="form-select-custom"
            value={formData.proposedMemberId}
            onChange={(e) => setFormData({...formData, proposedMemberId: e.target.value})}
          >
            <option value="">Vsi (nedodeljeno)</option>
            {projectMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name || m.username || m.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions mt-4 text-end">
        <button type="submit" className="btn btn-primary px-4 shadow-sm">
          {isEditing ? 'Shrani spremembe' : 'Ustvari nalogo'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;