import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../config/supabase";
import { getUsers } from "../services/projects";
import { validatePassword } from "../services/auth";
import PasswordMeter from "../components/PasswordMeter";
import "./AdminPage.css";

function getDisplayValue(password, revealLastChar, showPassword) {
  if (showPassword) return password;
  if (revealLastChar && password.length > 0) return '•'.repeat(password.length - 1) + password.slice(-1);
  return '•'.repeat(password.length);
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [revealLastChar, setRevealLastChar] = useState(false);
  const revealTimer = useRef(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [revealLastCharConfirm, setRevealLastCharConfirm] = useState(false);
  const revealTimerConfirm = useRef(null);
  const [formData, setFormData] = useState({
    username: "", password: "", firstName: "", lastName: "", email: "", role: "User"
  });

  const handlePasswordChange = (e) => {
    const newVal = e.target.value;
    const oldDisplay = getDisplayValue(formData.password, revealLastChar, showPassword);
    const diff = newVal.length - oldDisplay.length;

    if (showPassword) {
      setFormData(f => ({ ...f, password: newVal }));
    } else if (diff !== 0) {
      let pos = 0;
      while (pos < Math.min(newVal.length, oldDisplay.length) && newVal[pos] === oldDisplay[pos]) pos++;
      if (diff > 0) {
        const inserted = newVal.slice(pos, pos + diff);
        setFormData(f => ({ ...f, password: f.password.slice(0, pos) + inserted + f.password.slice(pos) }));
      } else {
        setFormData(f => ({ ...f, password: f.password.slice(0, pos) + f.password.slice(pos - diff) }));
      }
    }

    if (!showPassword) {
      setRevealLastChar(true);
      clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealLastChar(false), 1000);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const newVal = e.target.value;
    const oldDisplay = getDisplayValue(confirmPassword, revealLastCharConfirm, showConfirmPassword);
    const diff = newVal.length - oldDisplay.length;

    if (showConfirmPassword) {
      setConfirmPassword(newVal);
    } else if (diff !== 0) {
      let pos = 0;
      while (pos < Math.min(newVal.length, oldDisplay.length) && newVal[pos] === oldDisplay[pos]) pos++;
      if (diff > 0) {
        const inserted = newVal.slice(pos, pos + diff);
        setConfirmPassword(p => p.slice(0, pos) + inserted + p.slice(pos));
      } else {
        setConfirmPassword(p => p.slice(0, pos) + p.slice(pos - diff));
      }
    }

    if (!showConfirmPassword) {
      setRevealLastCharConfirm(true);
      clearTimeout(revealTimerConfirm.current);
      revealTimerConfirm.current = setTimeout(() => setRevealLastCharConfirm(false), 1000);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) { console.error(err); }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (formData.password !== confirmPassword) {
      setMessage("Gesli se ne ujemata.");
      setMessageType("error");
      return;
    }

    try {
      validatePassword(formData.password);
    } catch (err) {
      setMessage(err.message);
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", { body: formData });
      if (error) {
        const body = await error.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      setMessage("Uporabnik uspešno dodan.");
      setMessageType("success");
      setFormData({ username: "", password: "", firstName: "", lastName: "", email: "", role: "User" });
      setConfirmPassword('');
      loadUsers();
    } catch (err) {
      setMessage(err.message);
      setMessageType("error");
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="admin-title">Upravljanje uporabnikov</h1>

        {/* Sekcija za dodajanje */}
        <div className="admin-card">
          <h2 className="card-title">Dodaj novega uporabnika</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <input name="firstName" placeholder="Ime" value={formData.firstName} onChange={handleChange} />
              <input name="lastName" placeholder="Priimek" value={formData.lastName} onChange={handleChange} />
            </div>
            <input name="username" placeholder="Uporabniško ime" value={formData.username} onChange={handleChange} />
            <input type="email" name="email" placeholder="E-pošta" value={formData.email} onChange={handleChange} />
            <div className="password-input-wrapper">
              <input type="text" autoComplete="new-password" name="password" placeholder="Geslo" value={getDisplayValue(formData.password, revealLastChar, showPassword)} onChange={handlePasswordChange} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} className="password-input" />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? "Skrij geslo" : "Prikaži geslo"}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            <PasswordMeter password={formData.password} />
            <div className="password-input-wrapper">
              <input type="text" autoComplete="new-password" placeholder="Potrdi geslo" value={getDisplayValue(confirmPassword, revealLastCharConfirm, showConfirmPassword)} onChange={handleConfirmPasswordChange} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} className="password-input" />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(p => !p)} aria-label={showConfirmPassword ? "Skrij geslo" : "Prikaži geslo"}>
                {showConfirmPassword ? '🙈' : '👁'}
              </button>
            </div>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Admin">Administrator sistema</option>
              <option value="User">Uporabnik sistema</option>
            </select>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? "Dodajam..." : "Dodaj uporabnika"}
            </button>
          </form>
          {message && <p className={messageType === 'error' ? 'error-badge' : 'message success'}>{message}</p>}
        </div>

        {/* Seznam uporabnikov */}
<div className="admin-card">
  <h2 className="card-title">Seznam uporabnikov</h2>
  <div className="user-list-container"> 
    <div className="user-list">
      {users.length === 0 ? (
        <p className="empty-msg">Ni uporabnikov.</p>
      ) : (
        users.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <strong>{user.name} {user.surname}</strong>
              <span>{user.email}</span>
            </div>
            <div className="user-badge">
              <span className="username">@{user.username}</span>
              <span className={`role-tag ${user.UserRoles?.[0]?.Roles?.name === 'Admin' ? 'admin' : 'user'}`}>
                {user.UserRoles?.[0]?.Roles?.name === 'Admin' ? 'Administrator' : 'Uporabnik'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
</div>
      </div>
    </div>
  );
}