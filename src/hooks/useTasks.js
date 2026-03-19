import { useState, useCallback } from 'react';
import {
  getSprintBacklogById,
  createTask,
  acceptTask,
  finishTask,
  updateTaskStatus
} from '../services/tasks';

export const useTasks = (projectId) => {
  const [sprintData, setSprintData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSprintId, setCurrentSprintId] = useState(null);

  const fetchSprintBacklog = useCallback(async (sprintId) => {
    if (!sprintId) return;
    setCurrentSprintId(sprintId);
    setLoading(true);
    setError(null);
    try {
      const data = await getSprintBacklogById(projectId, sprintId);
      setSprintData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refresh = useCallback(() => {
    if (currentSprintId) fetchSprintBacklog(currentSprintId);
  }, [currentSprintId, fetchSprintBacklog]);

  const handleCreateTask = async (userStoryId, taskFields) => {
    try {
      await createTask(userStoryId, taskFields);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      await acceptTask(taskId);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleFinishTask = async (taskId) => {
    try {
      await finishTask(taskId);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Ključna funkcija za Drag & Drop
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      setLoading(true);
      await updateTaskStatus(taskId, newStatus); 
      refresh(); 
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    sprintData, 
    loading, 
    error, 
    fetchSprintBacklog, 
    handleCreateTask, 
    handleAcceptTask,
    handleFinishTask,
    handleUpdateTaskStatus
  };
};