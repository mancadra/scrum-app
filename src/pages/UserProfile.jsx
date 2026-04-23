import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUser, changePassword } from '../services/auth'; 
import { updateOwnProfile } from '../services/users-client';
import { 
  getActiveSprint,
  getMyTimeEntries, 
  updateTimeEntry, 
  setRemainingHours,
  getMyTasksForSprint,
  createTimeEntry
} from '../services/timetables';
import './UserProfile.css';

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('profile'); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // --- STANJE ZA PROFIL ---
  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', username: '', email: ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '', newPassword: '', confirmPassword: ''
  });

  // --- STANJE ZA DNEVNIK DELA (TIMESHEET) ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workLogs, setWorkLogs] = useState([]);
  const [sprint, setSprint] = useState(null);
  const [taskMap, setTaskMap] = useState({}); // FIX 1: Spremenjeno iz useMemo v useState
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const [sprintsList, setSprintsList] = useState([]);
const [selectedSprintId, setSelectedSprintId] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'timesheet') {
      initTimesheet();
    }
  }, [activeTab]);

  // Add these to your component's state if you haven't already:
const [sprintsList, setSprintsList] = useState([]);
const [selectedSprintId, setSelectedSprintId] = useState('');

// --- 1. INIT TIMESHEET ---
const initTimesheet = async (specificSprintId = null) => {
  setLoading(true);
  try {
      // Fetch all sprints for the dropdown
      const allSprints = await getMySprints();
      setSprintsList(allSprints);

      let activeSprint;
      if (specificSprintId) {
          activeSprint = allSprints.find(s => s.id === parseInt(specificSprintId));
      } else {
          activeSprint = await getActiveSprint(); 
          if (!activeSprint && allSprints.length > 0) activeSprint = allSprints[0];
      }

      if (activeSprint) {
          setSprint(activeSprint);
          setSelectedSprintId(activeSprint.id);
          
          const tasks = await getMyTasksForSprint(activeSprint.id);
          const entries = await getMyTimeEntries({ 
              from: activeSprint.startingDate, 
              to: activeSprint.endingDate 
          });

          const initialMap = {};
          tasks.forEach(t => {
              initialMap[t.id] = {
                  description: t.description,
                  storyName: t.storyName,
                  timecomplexity: t.timecomplexity,
                  remaininghours: t.remaininghours, // Store the single DB value here
                  days: {}
              };
          });

          // Map logged hours to specific days
          entries.forEach(entry => {
              const dateKey = entry.starttime.split('T')[0];
              if (initialMap[entry.taskId]) {
                  initialMap[entry.taskId].days[dateKey] = {
                      logId: entry.id,
                      hours: entry.hours || 0
                  };
              }
          });

          setWorkLogs(entries); 
          setTaskMap(initialMap); 
      }
  } catch (err) {
      setMessage({ text: err.message, type: 'error' });
  } finally {
      setLoading(false);
  }
};

// --- 2. CALCULATE SPRINT DAYS (CUT OFF AT TODAY) ---
const sprintDays = useMemo(() => {
  if (!sprint) return [];
  const days = [];
  let current = new Date(sprint.startingDate);
  current.setHours(0,0,0,0);
  
  const endOfSprint = new Date(sprint.endingDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Cutoff is either Today OR the end of the sprint (whichever is earlier)
  const end = today < endOfSprint ? today : endOfSprint;
  
  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}, [sprint]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const profile = user.profile || user; 
        setProfileData({
          firstName: profile.name || '',
          lastName: profile.surname || '',
          username: profile.username || '',
          email: profile.email || ''
        });
      }
    } catch (error) {
      console.error('Napaka pri nalaganju profila:', error);
    }
  };

  const loadWorkLogs = async (date) => {
    setTimesheetLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const data = await getMyTimeEntries({ from: date, to: date });
      setWorkLogs(data);
    } catch (err) {
      setMessage({ text: err, type: 'error' });
    } finally {
      setTimesheetLoading(false);
    }
  };

  const handleHoursChange = async (log, newHours) => {
    const oldHours = log.hours || 0;
    const startingRemaining = (log.remaininghours !== null && log.remaininghours !== undefined) 
      ? log.remaininghours 
      : (log.timecomplexity || 0);

    const delta = newHours - oldHours;
    const newRemaining = Math.max(0, startingRemaining - delta);

    try {
      setLoading(true);
      await updateTimeEntry(log.id, newHours);
      await setRemainingHours(log.taskId, newRemaining);
      
      setMessage({ text: 'Ure posodobljene in preostanek izračunan.', type: 'success' });
      initTimesheet(); // Osvežimo celotno tabelo
    } catch (err) {
      setMessage({ text: err.message || err, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemainingChange = async (taskId, hours) => {
    if (isNaN(hours)) return;
    try {
      setLoading(true);
      await setRemainingHours(taskId, hours);
      setMessage({ text: 'Preostale ure posodobljene.', type: 'success' });
      initTimesheet();
    } catch (err) {
      setMessage({ text: err, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await updateOwnProfile(profileData);
      setMessage({ text: 'Profil uspešno posodobljen.', type: 'success' });
    } catch (err) {
      setMessage({ text: err || 'Napaka pri posodabljanju profila.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'Novi gesli se ne ujemata!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await changePassword(passwordData.oldPassword, passwordData.newPassword);
      setMessage({ text: 'Geslo uspešno spremenjeno.', type: 'success' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({ text: err || 'Napaka pri spremembi gesla.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="background-wrapper">
      <div className="user-profile-container">
        <h1 className="page-title">Moj profil in delo</h1>

        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            Osebni podatki
          </button>
          <button className={`tab-btn ${activeTab === 'timesheet' ? 'active' : ''}`} onClick={() => setActiveTab('timesheet')}>
            Dnevnik dela (Timesheet)
          </button>
        </div>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-content">
            <div className="profile-card">
              <h2>Urejanje podatkov</h2>
              <form onSubmit={handleProfileSubmit}>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Ime</label>
                    <input type="text" value={profileData.firstName} onChange={e => setProfileData({...profileData, firstName: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Priimek</label>
                    <input type="text" value={profileData.lastName} onChange={e => setProfileData({...profileData, lastName: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Uporabniško ime</label>
                  <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>E-pošta</label>
                  <input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} required />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Shranjujem...' : 'Shrani podatke'}
                </button>
              </form>
            </div>

            <div className="profile-card">
              <h2>Sprememba gesla</h2>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label>Trenutno geslo</label>
                  <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Novo geslo</label>
                  <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required minLength={8} />
                </div>
                <div className="form-group">
                  <label>Potrdi novo geslo</label>
                  <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required minLength={8} />
                </div>
                <button type="submit" className="btn-secondary" disabled={loading}>
                  {loading ? 'Shranjujem...' : 'Spremeni geslo'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'timesheet' && sprint && (
          <div className="timesheet-full-sprint">
            <div className="sprint-info-header">
              <h2>Sprint: {sprint.id}</h2>
              <p>{new Date(sprint.startingDate).toLocaleDateString()} - {new Date(sprint.endingDate).toLocaleDateString()}</p>
            </div>

            {/* SPRINT SELECTOR HEADER */}
<div className="timesheet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
  <div>
    <h2>Dnevnik dela</h2>
    <p>{new Date(sprint.startingDate).toLocaleDateString()} - {new Date(sprint.endingDate).toLocaleDateString()}</p>
  </div>
  <div className="form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
    <label style={{ color: '#f0fff4' }}>Izberi Sprint:</label>
    <select 
      value={selectedSprintId} 
      onChange={(e) => initTimesheet(e.target.value)}
      className="sprint-dropdown"
    >
      {sprintsList.map(s => (
        <option key={s.id} value={s.id}>
          Sprint {s.id} ({new Date(s.startingDate).toLocaleDateString()})
        </option>
      ))}
    </select>
  </div>
</div>

{/* MAIN TABLE */}
<div className="table-responsive">
  <table className="sprint-matrix-table transposed">
    <thead>
      <tr>
        <th className="sticky-col">Datum</th>
        {Object.keys(taskMap).map(taskId => (
          <th key={taskId} className="task-col">
            <strong>{taskMap[taskId].storyName}</strong><br/>
            <small>{taskMap[taskId].description}</small>
          </th>
        ))}
        <th className="sum-col">Skupaj / Dan</th>
      </tr>
    </thead>
    
    <tbody>
      {sprintDays.map(day => {
        let totalDayHours = 0;

        return (
          <tr key={day}>
            <td className="sticky-col date-cell">
              <strong>{new Date(day).toLocaleDateString('sl-SI', { weekday: 'short' })}</strong>,{' '}
              {new Date(day).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })}
            </td>
            
            {Object.keys(taskMap).map(taskId => {
              const task = taskMap[taskId];
              const dayData = task.days[day] || { hours: 0 };
              totalDayHours += dayData.hours;

              return (
                <td key={`${day}-${taskId}`} className="hour-cell">
                  <div className="daily-input-group">
                    
                    {/* 1. PORABLJENE URE (LOGGED HOURS) */}
                    <div className="input-row">
                      <span className="input-label">Ure:</span>
                      <input 
                        type="number" min="0" step="0.5" 
                        defaultValue={dayData.hours === 0 ? '' : dayData.hours} 
                        placeholder="0"
                        onBlur={async (e) => {
                          const newVal = parseFloat(e.target.value);
                          if (isNaN(newVal) || newVal < 0) return;
                          
                          try {
                            if (dayData.logId) {
                                await updateTimeEntry(dayData.logId, newVal);
                            } else if (newVal > 0) {
                                await createTimeEntry(taskId, day, newVal);
                            }
                            initTimesheet(selectedSprintId); // Refresh totals
                          } catch (err) {
                            setMessage({ text: err.message, type: 'error' });
                          }
                        }}
                      />
                    </div>
                    
                    {/* 2. PREOSTALE URE (REMAINING HOURS OVERWRITE) */}
                    <div className="input-row remaining-row">
                      <span className="input-label">Preostalo:</span>
                      <input 
                        type="number" min="0" step="0.5" 
                        placeholder={task.remaininghours ?? task.timecomplexity}
                        onBlur={async (e) => {
                          const newVal = parseFloat(e.target.value);
                          if (isNaN(newVal) || newVal < 0 || newVal === task.remaininghours) return;
                          
                          try {
                            // Overwrites the main task remaining hours
                            await setRemainingHours(taskId, newVal);
                            initTimesheet(selectedSprintId); // Refresh to update placeholders
                            e.target.value = ''; // Clear input so placeholder shows new value
                          } catch (err) {
                            setMessage({ text: err.message, type: 'error' });
                          }
                        }}
                      />
                    </div>

                  </div>
                </td>
              );
            })}
            
            <td className="sum-cell">{totalDayHours}h</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
          </div>
        )}
      </div>
    </div>
  );
}