import React, { useState } from 'react';
import { useStories } from '../hooks/useStories';
import './UserStoryForm.css'; // Prepričaj se, da si ustvaril to datoteko s prejšnjim CSS-om

const UserStoryForm = ({ projectId, existingStories, onStoryCreated, onClose }) => {
  const { addStory, loading, error: apiError } = useStories(projectId);
  const [form, setForm] = useState({
    name: '',
    description: '',
    acceptance_tests: '',
    priority: 'should_have',
    businessValue: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // stories.js pričakuje businessValue kot številko
    const result = await addStory({
      ...form,
      businessValue: parseInt(form.businessValue)
    }, existingStories);
    
    if (result) {
      onStoryCreated(result);
      onClose();
    }
  };

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      {/* stopPropagation prepreči, da bi se sidebar zaprl, če klikneš znotraj obrazca */}
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
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Besedilo zgodbe</label>
            <textarea 
              required 
              placeholder="Kot uporabnik želim..., da..."
              value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Sprejemni testi</label>
            <textarea 
              placeholder="Vsak test v svojo vrstico..."
              value={form.acceptance_tests} 
              onChange={(e) => setForm({...form, acceptance_tests: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Prioriteta (MoSCoW)</label>
            <select 
              value={form.priority} 
              onChange={(e) => setForm({...form, priority: e.target.value})}
            >
              <option value="must_have">Must have</option>
              <option value="should_have">Should have</option>
              <option value="could_have">Could have</option>
              <option value="wont_have">Won't have this time</option>
            </select>
          </div>

          <div className="form-group">
            <label>Poslovna vrednost (BV)</label>
            <input 
              type="number" 
              min="1" 
              value={form.businessValue} 
              onChange={(e) => setForm({...form, businessValue: e.target.value})}
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