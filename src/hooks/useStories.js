import { useState, useEffect, useCallback } from 'react';
import { createUserStory, getStoriesForProject } from '../services/stories';

export const useStories = (projectId) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshBacklog = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getStoriesForProject(projectId);
      setStories(data);
    } catch (err) {
      setError(err.message);
    }
  }, [projectId]);

  useEffect(() => {
    refreshBacklog();
  }, [refreshBacklog]);

  const addStory = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const newStory = await createUserStory(projectId, {
        name: formData.name,
        description: formData.description,
        acceptanceTests: formData.acceptanceTests ? [formData.acceptanceTests] : [],
        priorityId: formData.priorityId,
        businessValue: parseInt(formData.businessValue)
      });
      await refreshBacklog();
      setLoading(false);
      return newStory;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  return { stories, refreshBacklog, addStory, loading, error };
};