import React, { useState, useEffect } from 'react';
import { getPriorities } from '../services/stories';
import './UserStoryForm.css';

const UserStoryForm = ({ 
  projectId, 
  onStoryCreated, 
  onClose, 
  addStory, // To je funkcija handleCreateStory ali handleUpdateStory iz starša
  loading, 
  error: apiError,
  initialData 
}) => {
  const [priorities, setPriorities] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    acceptanceTests: '',
    priorityId: '',
    businessValue: 1
  });

  // 1. Nalaganje prioritet
  useEffect(() => {
    getPriorities().then(data => {
      setPriorities(data);
      // Nastavimo privzeto prioriteto samo, če NE urejamo obstoječe zgodbe
      if (data.length > 0 && !initialData) {
        setForm(f => ({ ...f, priorityId: data[0].id }));
      }
    });
  }, [initialData]);

  // 2. Polnjenje forme, če urejamo (initialData)
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        // Sprejemne teste spremenimo iz arraya nazaj v string z novimi vrsticami
        acceptanceTests: Array.isArray(initialData.acceptanceTests) 
          ? initialData.acceptanceTests.join('\n') 
          : (initialData.acceptanceTests || ''),
        priorityId: initialData.FK_priorityId || initialData.priorityId || '',
        businessValue: initialData.businessValue || 1
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Priprava podatkov za backend
    const storyData = {
      name: form.name,
      description: form.description,
      acceptanceTests: form.acceptanceTests
        ? form.acceptanceTests.split('\n').map(t => t.trim()).filter(Boolean)
        : [],
      priorityId: form.priorityId,
      businessValue: parseInt(form.businessValue),
    };

    const result = await addStory(storyData);

    // Če je operacija uspela, pokličemo callbacke
    if (result) {
      if (onStoryCreated) onStoryCreated(result);
      onClose();
    }
  };

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-container" onClick={(e) => e.stopPropagation()}>

        <div className="sidebar-header">
          {/* Dinamični naslov */}
          <h2>{initialData ? 'Uredi uporabniško zgodbo' : 'Nova uporabniška zgodba'}</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="story-form">
          {apiError && <div className="error-message alert alert-danger">{apiError}</div>}

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
            <label>Sprejemni testi (vsak v svojo vrstico)</label>
            <textarea
              placeholder="Test 1&#10;Test 2..."
              value={form.acceptanceTests}
              onChange={(e) => setForm({ ...form, acceptanceTests: e.target.value })}
              rows={5}
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
            <label>Poslovna vrednost (BV: 1-10)</label>
            <input
              type="number"
              required
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
            {/* Dinamičen napis na gumbu */}
            {loading ? 'Shranjevanje...' : (initialData ? 'Shrani spremembe' : 'Dodaj zgodbo')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserStoryForm;