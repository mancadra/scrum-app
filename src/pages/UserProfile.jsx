import React, { useState, useEffect } from 'react';
import { getCurrentUser, changePassword } from '../services/auth'; 
import { updateOwnProfile } from '../services/users-client';
import { 
  getMyTimeEntries, 
  updateTimeEntry, 
  setRemainingHours 
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
  const [timesheetLoading, setTimesheetLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'timesheet') {
      loadWorkLogs(selectedDate);
    }
  }, [activeTab, selectedDate]);

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

  const handleHoursChange = async (entryId, hours) => {
    try {
      setLoading(true);
      await updateTimeEntry(entryId, hours);
      setMessage({ text: 'Ure uspešno posodobljene.', type: 'success' });
      // Ni potrebe po celotnem reloadu, če želiš hitrejši UI, 
      // vendar loadWorkLogs zagotovi, da so podatki v sinhronu z bazo.
      loadWorkLogs(selectedDate); 
    } catch (err) {
      setMessage({ text: err, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemainingChange = async (taskId, hours) => {
    try {
      setLoading(true);
      await setRemainingHours(taskId, hours);
      setMessage({ text: 'Preostale ure posodobljene.', type: 'success' });
      loadWorkLogs(selectedDate);
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

        {activeTab === 'timesheet' && (
          <div className="timesheet-content">
            <div className="timesheet-header">
              <h2>Preglednica dela na nalogah</h2>
              <div className="date-selector">
                <label>Izberi dan:</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>

            {timesheetLoading ? (
              <p>Nalagam podatke...</p>
            ) : (
              <div className="table-responsive">
                <table className="timesheet-table">
                  <thead>
                    <tr>
                      <th>Naloga</th>
                      <th>Vložene ure</th>
                      <th>Preostale ure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workLogs.length === 0 ? (
                      <tr><td colSpan="3" className="text-center">Ni zabeleženih nalog za ta dan.</td></tr>
                    ) : (
                      workLogs.map(log => (
                        <tr key={log.id}>
                          <td>
                            <div className="task-info">
                              <strong>{log.storyName}</strong>: {log.taskDescription}
                            </div>
                          </td>
                          <td>
                            <div className="input-with-unit">
                              <input 
                                type="number" min="0" max="24" step="0.5" 
                                defaultValue={log.hours} 
                                onBlur={(e) => handleHoursChange(log.id, parseFloat(e.target.value))}
                              />
                              <span>h</span>
                            </div>
                          </td>
                          <td>
                            <div className="input-with-unit">
                              <input 
                                type="number" min="0" step="0.5" 
                                defaultValue={log.remaininghours} 
                                onBlur={(e) => handleRemainingChange(log.taskId, parseFloat(e.target.value))}
                              />
                              <span>h</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}