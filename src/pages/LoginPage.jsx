import React, { useState, useRef } from 'react';
import './LoginPage.css';
import { signIn, changePasswordAnon } from '../services/auth';
import { useNavigate } from 'react-router-dom';

function getDisplayValue(password, revealLastChar, showPassword) {
  if (showPassword) return password;
  if (revealLastChar && password.length > 0) return '•'.repeat(password.length - 1) + password.slice(-1);
  return '•'.repeat(password.length);
}

function PasswordField({ id, className, placeholder, value, onChange, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);
  const [revealLastChar, setRevealLastChar] = useState(false);
  const revealTimer = useRef(null);

  const handleChange = (e) => {
    const newVal = e.target.value;
    const oldDisplay = getDisplayValue(value, revealLastChar, showPassword);
    const diff = newVal.length - oldDisplay.length;

    if (showPassword) {
      onChange(newVal);
    } else if (diff !== 0) {
      let pos = 0;
      while (pos < Math.min(newVal.length, oldDisplay.length) && newVal[pos] === oldDisplay[pos]) pos++;
      if (diff > 0) {
        const inserted = newVal.slice(pos, pos + diff);
        onChange(value.slice(0, pos) + inserted + value.slice(pos));
      } else {
        onChange(value.slice(0, pos) + value.slice(pos - diff));
      }
    }

    if (!showPassword) {
      setRevealLastChar(true);
      clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealLastChar(false), 1000);
    }
  };

  return (
    <div className="password-input-wrapper">
      <input
        className={`${className} password-input`}
        id={id}
        type="text"
        autoComplete={autoComplete ?? 'off'}
        placeholder={placeholder}
        value={getDisplayValue(value, revealLastChar, showPassword)}
        onChange={handleChange}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        required
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? '🙈' : '👁'}
      </button>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');

  // login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // change password state
  const [cpUsername, setCpUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchMode = (next) => {
    setError('');
    setSuccess('');
    setMode(next);
  };

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(username, password);

      if (result?.mfaRequired) {
        setError('MFA is required for this account.');
        return;
      }

      onLogin?.(result);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePasswordAnon(cpUsername, oldPassword, newPassword);
      setSuccess('Password changed successfully. You can now log in.');
      setCpUsername('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'changePassword') {
    return (
      <div className="login-page">
        <h1 className="login-page__title">SCRUM Aplikacija</h1>
        <form className="login-form" onSubmit={handleChangePasswordSubmit}>
          <h1 className="login-title">Change Password</h1>

          <label className="login-label" htmlFor="cp-username">Uporabniško ime</label>
          <input
            className="login-input"
            id="cp-username"
            type="text"
            placeholder="Vstavite vaše uporabniško ime"
            value={cpUsername}
            onChange={(e) => setCpUsername(e.target.value)}
            required
          />

          <label className="login-label" htmlFor="cp-old">Trenutno geslo</label>
          <PasswordField
            id="cp-old"
            className="login-input"
            placeholder="Vstavite vaše trenutno geslo"
            value={oldPassword}
            onChange={setOldPassword}
            autoComplete="current-password"
          />

          <label className="login-label" htmlFor="cp-new">Novo geslo</label>
          <PasswordField
            id="cp-new"
            className="login-input"
            placeholder="Vstavite vaše novo geslo"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />

          <label className="login-label" htmlFor="cp-confirm">Potrdite novo geslo</label>
          <PasswordField
            id="cp-confirm"
            className="login-input"
            placeholder="Potrdite vaše novo geslo"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? 'Spreminjanje...' : 'Spremenite Geslo'}
          </button>
          <button className="login-link" type="button" onClick={() => switchMode('login')}>
            Nazaj k Prijavi
          </button>

          {error && <p className="error-badge">{error}</p>}
          {success && <p className="success-badge">{success}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="login-page">
      <h1 className="login-page__title">SCRUM Aplikacija</h1>
      <form className="login-form" onSubmit={handleLoginSubmit}>
        <h1 className="login-title">Prijava</h1>

        <label className="login-label" htmlFor="username">Uporabniško ime</label>
        <input
          className="login-input"
          id="username"
          type="text"
          placeholder="Vstavite vaše uporabniško ime"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label className="login-label" htmlFor="password">Geslo</label>
        <PasswordField
          id="password"
          className="login-input"
          placeholder="Vstavite vaše geslo"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Prijavljanje...' : 'Prijava'}
        </button>
        <button className="login-link" type="button" onClick={() => switchMode('changePassword')}>
          Spremeni Geslo
        </button>

        {error && <p className="error-badge">{error}</p>}
      </form>
    </div>
  );
}
