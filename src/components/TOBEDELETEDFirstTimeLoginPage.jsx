import React, { useState } from 'react';
import './TOBEDELETEDFirstTimeLoginPage.css';
console.log('THE FILE FirstTimeLoginPage.jsx WAS RUN, WE EXPECT TO DELETE IT');
export default function TOBEDELETEDFirstTimeLoginPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isPasswordLengthValid =
    password.length >= 12 && password.length <= 64;
  const doPasswordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  function handleSubmit(event) {
    event.preventDefault();

    if (!isPasswordLengthValid) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    console.log('Password changed:', password);

    // Add password change logic here
  }

  return (
    <div className="first-time-login-page">
      <form className="first-time-login-form" onSubmit={handleSubmit}>
        <h1 className="first-time-login-title">First Time Login</h1>

        <p className="first-time-login-message">
          We see this is your first time logging in, please change your password
          to your preferred one.
        </p>

        <label className="first-time-login-label" htmlFor="password">
          New Password
        </label>
        <div className="first-time-login-password-wrapper">
          <input
            className="first-time-login-input first-time-login-password-input"
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            maxLength={64}
            required
          />
          <button
            className="first-time-login-password-toggle"
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        {!isPasswordLengthValid && password.length > 0 && (
          <p className="first-time-login-hint">
            Password must be at least 12 characters long and no more than 64
            characters.
          </p>
        )}

        <label className="first-time-login-label" htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <div className="first-time-login-password-wrapper">
          <input
            className="first-time-login-input first-time-login-password-input"
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Enter your new password again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            maxLength={64}
            required
          />
          <button
            className="first-time-login-password-toggle"
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? '🙈' : '👁'}
          </button>
        </div>
        {!doPasswordsMatch && (
          <p className="first-time-login-hint">Passwords do not match.</p>
        )}

        <button className="first-time-login-button" type="submit">
          Change Password
        </button>
      </form>
    </div>
  );
}