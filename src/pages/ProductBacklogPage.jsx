import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStories } from '../hooks/useStories';
import UserStoryForm from '../components/UserStoryForm';


const ProductBacklogPage = () => {
  const { projectId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { stories, addStory, loading, error } = useStories(projectId);
  const navigate = useNavigate();
  const goToSprint = () => {
    navigate(`/project/${projectId}/sprint`);
  };

  return (
    <div className="p-6">
      <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button 
          onClick={goToSprint} 
          className="btn btn-outline-primary d-flex align-items-center gap-2"
        >
          <i className="bi bi-arrow-right-circle"></i> {/* Če uporabljaš bootstrap icons */}
          Aktivni Sprint (Sprint Backlog)
        </button>
      </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Product Backlog</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => setIsSidebarOpen(true)}
        >
          + Dodaj zgodbo
        </button>
      </div>

      <div className="story-list">
        {stories?.map(story => (
          <div key={story.id} className="border p-2 mb-2">{story.name}</div>
        ))}
      </div>

      {isSidebarOpen && (
        <UserStoryForm
          projectId={projectId}
          onStoryCreated={() => setIsSidebarOpen(false)}
          onClose={() => setIsSidebarOpen(false)}
          addStory={addStory}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
};

export default ProductBacklogPage;