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
import { startTimer, stopTimer } from '../services/timetables';

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

  const updateTaskInState = useCallback((taskId, updates) => {
    setSprintData(prev => {
      if (!prev) return prev;
      const newStories = prev.stories.map(story => {
        const newTasks = {};
        Object.keys(story.tasks).forEach(status => {
          newTasks[status] = story.tasks[status].map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          );
        });
        return { ...story, tasks: newTasks };
      });
      return { ...prev, stories: newStories };
    });
  }, []);

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
      const updatedTask = await rejectTask(taskId);
      const updates = {
        FK_acceptedDeveloper: updatedTask.FK_acceptedDeveloper,
        FK_proposedDeveloper: updatedTask.FK_proposedDeveloper,
      };
      if (!updatedTask.FK_acceptedDeveloper) updates.acceptedDev = null;
      if (!updatedTask.FK_proposedDeveloper) updates.proposedDev = null;
      updateTaskInState(taskId, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleFinishTask = async (taskId) => {
    try {
      await finishTask(taskId);
      updateTaskInState(taskId, { finished: true });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleReopenTask = async (taskId) => {
    try {
      await reopenTask(taskId);
      updateTaskInState(taskId, { finished: false });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleStartTimer = async (taskId) => {
    try {
      await startTimer(taskId);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleStopTimer = async (taskId) => {
    try {
      await stopTimer(taskId);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateStoryStatus = async (storyId, newStatus) => {
    try {
      const statusMap = {
        unassigned: { accepted: false, done: false, testing: false, realized: null },
        active:     { accepted: true,  done: false, testing: false, realized: null },
        testing:    { accepted: true,  done: false, testing: true,  realized: null },
        finished:   { accepted: true,  done: true,  testing: true,  realized: true },
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
    handleStartTimer,
    handleStopTimer,
    handleUpdateStoryStatus,
  };
};
