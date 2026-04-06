import { useState, useCallback } from 'react';
import { supabase } from "../config/supabase";
import {
  getSprintBacklogById,
  createTask,
  acceptTask,
  finishTask,
  reopenTask,
  rejectTask,
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

  const handleAcceptTask = async (taskId, userId) => {
    if (!userId) return;
    try {
      setSprintData(prev => {
        if (!prev) return prev;
        const newStories = prev.stories.map(story => {
          const updatedTasks = { ...story.tasks };
          Object.keys(updatedTasks).forEach(status => {
            updatedTasks[status] = updatedTasks[status].map(task =>
              task.id === taskId ? { ...task, FK_acceptedDeveloper: userId } : task
            );
          });
          return { ...story, tasks: updatedTasks };
        });
        return { ...prev, stories: newStories };
      });
      await acceptTask(taskId);
    } catch (err) {
      console.error('Napaka pri sprejemanju naloge:', err);
      refresh();
      throw err;
    }
  };

  const handleRejectTask = async (taskId) => {
    try {
      await rejectTask(taskId);
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

  const handleReopenTask = async (taskId) => {
    try {
      await reopenTask(taskId);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateStoryStatus = async (storyId, newStatus) => {
    try {
      const statusMap = {
        unassigned: { accepted: false, realized: false, testing: false },
        active:     { accepted: true,  realized: false, testing: false },
        testing:    { accepted: true,  realized: false, testing: true  },
        finished:   { accepted: true,  realized: true,  testing: true  },
      };
      const updateData = statusMap[newStatus] ?? {};

      const { error: supabaseError } = await supabase
        .from('UserStories')
        .update(updateData)
        .eq('id', storyId);

      if (supabaseError) throw supabaseError;
    } catch (err) {
      console.error('Napaka pri posodabljanju baze:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    sprintData,
    setSprintData,
    loading,
    error,
    fetchSprintBacklog,
    handleCreateTask,
    handleAcceptTask,
    handleRejectTask,
    handleFinishTask,
    handleReopenTask,
    handleUpdateStoryStatus,
  };
};
