import React, { useState, useRef } from 'react';
import './LoginPage.css';
import { signIn } from '../services/auth';
import { useNavigate } from 'react-router-dom';

function getDisplayValue(password, revealLastChar, showPassword) {
  if (showPassword) return password;
  if (revealLastChar && password.length > 0) return '•'.repeat(password.length - 1) + password.slice(-1);
  return '•'.repeat(password.length);
}

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revealLastChar, setRevealLastChar] = useState(false);
  const revealTimer = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const newVal = e.target.value;
    const oldDisplay = getDisplayValue(password, revealLastChar, showPassword);
    const diff = newVal.length - oldDisplay.length;

    if (showPassword) {
      setPassword(newVal);
    } else if (diff !== 0) {
      let pos = 0;
      while (pos < Math.min(newVal.length, oldDisplay.length) && newVal[pos] === oldDisplay[pos]) pos++;
      if (diff > 0) {
        const inserted = newVal.slice(pos, pos + diff);
        setPassword(p => p.slice(0, pos) + inserted + p.slice(pos));
      } else {
        setPassword(p => p.slice(0, pos) + p.slice(pos - diff));
      }
    }

    if (!showPassword) {
      setRevealLastChar(true);
      clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealLastChar(false), 1000);
    }
  };

  async function handleSubmit(event) {
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

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">Login</h1>

        <label className="login-label" htmlFor="username">
          Username
        </label>
        <input
          className="login-input"
          id="username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label className="login-label" htmlFor="password">
          Password
        </label>
        <div className="password-input-wrapper">
          <input
            className="login-input password-input"
            id="password"
            type="text"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={getDisplayValue(password, revealLastChar, showPassword)}
            onChange={handlePasswordChange}
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

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p className="error-badge">{error}</p>}
      </form>
    </div>
  );
}