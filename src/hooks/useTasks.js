import { useState, useCallback } from 'react';
import { supabase } from "../config/supabase";
import {
  getSprintBacklogById,
  createTask,
  acceptTask,
  finishTask,
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

  // V useTasks.js
const handleAcceptTask = async (taskId, currentUser) => {
  if (!currentUser) return;

  try {
    // 1. UI posodobitev (Optimistic)
    setSprintData(prev => {
      if (!prev) return prev;
      const newStories = prev.stories.map(story => {
        // Poiščemo zgodbo, ki vsebuje to nalogo
        const updatedTasks = { ...story.tasks };
        Object.keys(updatedTasks).forEach(status => {
          updatedTasks[status] = updatedTasks[status].map(task => 
            task.id === taskId ? { ...task, FK_developer: currentUser.id, developer_name: currentUser.username } : task
          );
        });
        return { ...story, tasks: updatedTasks };
      });
      return { ...prev, stories: newStories };
    });

    // 2. Klic v bazo (v servisih moraš imeti acceptTask, ki sprejme taskId in userId)
    await acceptTask(taskId);
    
  } catch (err) {
    console.error("Napaka pri sprejemanju naloge:", err);
    refresh(); // Če gre kaj narobe, povrnemo realno stanje iz baze
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
  // Posodobljena funkcija za tiho posodabljanje (brez loadinga in refresha)
  const handleUpdateStoryStatus = async (storyId, newStatus) => {
    try {
      // 1. ODSTRANIMO setLoading(true), da tabla ne izgine
      let updateData = {};

      if (newStatus === 'unassigned') {
        updateData = { accepted: false, realized: false, testing: false };
      } else if (newStatus === 'active') {
        // Oba stolpca v bazi trenutno pomenita "Accepted"
        updateData = { accepted: true, realized: false, testing: false };
      } else if (newStatus === 'testing') {
        updateData = { accepted: true, realized: false, testing: true };
      } else if (newStatus === 'finished') {
        updateData = { accepted: true, realized: true, testing: true };
      }

      const { error: supabaseError } = await supabase
        .from('UserStories') 
        .update(updateData)
        .eq('id', storyId);

      if (supabaseError) throw supabaseError;
      
      // 2. ODSTRANIMO refresh(), ker smo UI posodobili že v SprintPage.jsx
      // await refresh(); 

    } catch (err) {
      console.error("Napaka pri posodabljanju baze:", err);
      setError(err.message);
      throw err; // Vrže napako nazaj v SprintPage, da ta lahko naredi "rollback"
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
    handleFinishTask,
    handleUpdateStoryStatus
  };
};