import React, { useState, useEffect } from 'react';
import { getPriorities } from '../services/stories';
import './UserStoryForm.css';

const UserStoryForm = ({ projectId, onStoryCreated, onClose, addStory, loading, error: apiError }) => {
  const [priorities, setPriorities] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    acceptanceTests: '',
    priorityId: '',
    businessValue: 1
  });

  useEffect(() => {
    getPriorities().then(data => {
      setPriorities(data);
      if (data.length > 0) setForm(f => ({ ...f, priorityId: data[0].id }));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await addStory({
      name: form.name,
      description: form.description,
      acceptanceTests: form.acceptanceTests
        ? form.acceptanceTests.split('\n').map(t => t.trim()).filter(Boolean)
        : [],
      priorityId: form.priorityId,
      businessValue: parseInt(form.businessValue),
    });

    if (result) {
      onStoryCreated(result);
      onClose();
    }
  };

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-container" onClick={(e) => e.stopPropagation()}>

        <div className="sidebar-header">
          <h2>Nova uporabniška zgodba</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="story-form">
          {apiError && <div className="error-message">{apiError}</div>}

          <div className="form-group">
            <label>Ime zgodbe</label>
            <input
              type="text"
              required
              placeholder="Vpišite kratko in jasno ime"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Besedilo zgodbe</label>
            <textarea
              required
              placeholder="Kot uporabnik želim..., da..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Sprejemni testi</label>
            <textarea
              placeholder="Vsak test v svojo vrstico..."
              value={form.acceptanceTests}
              onChange={(e) => setForm({ ...form, acceptanceTests: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Prioriteta (MoSCoW)</label>
            <select
              value={form.priorityId}
              onChange={(e) => setForm({ ...form, priorityId: Number(e.target.value) })}
            >
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.priority}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Poslovna vrednost (BV)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.businessValue}
              onChange={(e) => setForm({ ...form, businessValue: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? 'Shranjevanje...' : 'Dodaj zgodbo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserStoryForm;