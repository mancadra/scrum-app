import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase'; 
import { getCurrentUser, changePassword } from '../services/auth'; // Dodaj changePassword
import { updateOwnProfile } from '../services/users-client';
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
  // Naloži dnevnik dela za izbrani datum
  const loadWorkLogs = async (date) => {
    setTimesheetLoading(true);
    try {
      const user = await getCurrentUser();
      // TUKAJ KLICEŠ SVOJ BACKEND/SUPABASE ZA NALOGE
      // Primer (prilagodi svojim tabelam):
      /*
      const { data, error } = await supabase
        .from('WorkLogs')
        .select(`
          id, hoursLogged, remainingHours,
          Tasks ( id, name )
        `)
        .eq('userId', user.id)
        .eq('logDate', date);
      */
      
      // Začasni (mock) podatki za prikaz:
      const mockData = [
        { id: 1, taskId: 101, taskName: 'Prijavni obrazec', hoursLogged: 4, remainingHours: 2 },
        { id: 2, taskId: 102, taskName: 'Podatkovna baza - User tabela', hoursLogged: 3.5, remainingHours: 5 },
      ];
      setWorkLogs(mockData);

    } catch (error) {
      console.error('Napaka pri nalaganju dnevnika dela:', error);
    } finally {
      setTimesheetLoading(false);
    }
  };

  // Shrani spremembe profila
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      await updateOwnProfile({
        username: profileData.username,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email
      });

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
    setMessage({ text: '', type: '' });
    
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

  // Posodobi posamezno vrstico v tabeli dnevnika dela
  const handleWorkLogChange = (id, field, value) => {
    setWorkLogs(logs => logs.map(log => 
      log.id === id ? { ...log, [field]: value } : log
    ));
  };

  // Shrani dnevnik dela v bazo
  const handleSaveTimesheet = async () => {
    setTimesheetLoading(true);
    setMessage({ text: '', type: '' });
    try {
      // TUKAJ SHRANIŠ SPREMEMBE V BAZO
      // Primer:
      // for (const log of workLogs) {
      //   await supabase.from('WorkLogs').update({ hoursLogged: log.hoursLogged, remainingHours: log.remainingHours }).eq('id', log.id);
      // }
      
      setTimeout(() => { // Mock delay
        setMessage({ text: 'Dnevnik dela uspešno shranjen.', type: 'success' });
        setTimesheetLoading(false);
      }, 500);
    } catch (error) {
      setMessage({ text: 'Napaka pri shranjevanju dnevnika.', type: 'error' });
      setTimesheetLoading(false);
    }
  };

  return (
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

      {/* --- ZAVIHEK: OSEBNI PODATKI --- */}
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
  <input 
    type="password" 
    value={passwordData.oldPassword} 
    onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})} 
    required 
  />
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

      {/* --- ZAVIHEK: DNEVNIK DELA --- */}
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
                    <th>Vložene ure (ta dan)</th>
                    <th>Preostale ure (ocena)</th>
                  </tr>
                </thead>
                <tbody>
                  {workLogs.length === 0 ? (
                    <tr><td colSpan="3" className="text-center">Ni zabeleženih nalog za ta dan.</td></tr>
                  ) : (
                    workLogs.map(log => (
                      <tr key={log.id}>
                        <td>{log.taskName}</td>
                        <td>
                          <input 
                            type="number" 
                            min="0" step="0.5" 
                            className="time-input"
                            value={log.hoursLogged} 
                            onChange={(e) => handleWorkLogChange(log.id, 'hoursLogged', parseFloat(e.target.value) || 0)} 
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="0" step="0.5" 
                            className="time-input"
                            value={log.remainingHours} 
                            onChange={(e) => handleWorkLogChange(log.id, 'remainingHours', parseFloat(e.target.value) || 0)} 
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {workLogs.length > 0 && (
                <div className="timesheet-actions">
                  <button className="btn-primary" onClick={handleSaveTimesheet} disabled={timesheetLoading}>
                    Shrani dnevnik dela
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}