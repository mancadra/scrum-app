import { useState } from 'react';
import { createUserStory } from '../services/stories'; 

export const useStories = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      setLoading(false);
      return newStory;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  return { addStory, loading, error };
};