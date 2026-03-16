import { useState, useCallback } from 'react';
import { tasksService } from '../services/tasks';

export const useTasks = (storyId = null) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await tasksService.getTasksByStory(id || storyId);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  const addTask = async (taskData) => {
    setLoading(true);
    try {
      const newTask = await tasksService.createTask(taskData);
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, userId, newStatus) => {
    setLoading(true);
    try {
   
      const updates = {
        status: newStatus,
        assigned_user_id: userId 
      };

      const updatedTask = await tasksService.updateTask(taskId, updates);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
      );

      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTaskStatus
  };
};