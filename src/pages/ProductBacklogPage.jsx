import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStories } from '../hooks/useStories';
import UserStoryForm from '../components/UserStoryForm';

const ProductBacklogPage = () => {
  const { projectId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { stories, addStory, loading, error } = useStories(projectId);

  return (
    <div className="p-6">
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