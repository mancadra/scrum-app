import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { startTimer, stopTimer, getMyActiveTimer } from '../services/timetables';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  // activeTimer: { entryId, taskId, taskDescription, storyName, projectId, projectName, starttime }
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  // On mount: rehydrate any timer that was already running (e.g. after page refresh)
  useEffect(() => {
    getMyActiveTimer()
      .then(entry => { if (entry) setActiveTimer(entry); })
      .catch(() => {});
  }, []);

  // Live elapsed-time counter
  useEffect(() => {
    clearInterval(intervalRef.current);

    if (!activeTimer) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTimer.starttime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [activeTimer]);

  /**
   * Start a timer for the given task.
   * Calls the service, then fetches fresh timer info (with project/story names)
   * to populate the global timer bar.
   */
  const handleStartTimer = useCallback(async (taskId) => {
    await startTimer(taskId);
    const fresh = await getMyActiveTimer();
    setActiveTimer(fresh);
  }, []);

  /**
   * Stop the currently running timer.
   */
  const handleStopTimer = useCallback(async () => {
    if (!activeTimer) return;
    await stopTimer(activeTimer.taskId);
    setActiveTimer(null);
  }, [activeTimer]);

  return (
    <TimerContext.Provider value={{ activeTimer, elapsedSeconds, handleStartTimer, handleStopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
}
