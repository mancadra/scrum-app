import React, { useState } from 'react';
import './LoginPage.css';
import { signIn } from '../services/auth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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