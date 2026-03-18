import { useState, useCallback } from 'react';
// Uvozimo posamezne funkcije iz tvojega servisa
import { 
  getSprintBacklog, 
  createTask, 
  acceptTask, 
  finishTask 
} from '../services/tasks';

export const useTasks = (projectId) => {
  const [sprintData, setSprintData] = useState(null); // Vsebuje sprint in zgodbe z nalogami
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pridobivanje celotnega backloga za sprint
  const fetchSprintBacklog = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSprintBacklog(id || projectId);
      setSprintData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Dodajanje naloge
  const handleCreateTask = async (userStoryId, taskFields) => {
    try {
      await createTask(userStoryId, taskFields);
      await fetchSprintBacklog(); // Osvežimo vse, da dobimo nove podatke
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sprejemanje naloge
  const handleAcceptTask = async (taskId) => {
    try {
      await acceptTask(taskId);
      await fetchSprintBacklog(); // Osvežimo za premik kartice v drug stolpec
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Zaključek naloge
  const handleFinishTask = async (taskId) => {
    try {
      await finishTask(taskId);
      await fetchSprintBacklog();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { 
    sprintData, 
    loading, 
    error, 
    fetchSprintBacklog, 
    handleCreateTask, 
    handleAcceptTask,
    handleFinishTask
  };
};