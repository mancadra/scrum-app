import React from 'react';
import './PasswordMeter.css';

function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
}

const LABELS = ['', 'Šibko', 'Sprejemljivo', 'Dobro', 'Močno'];
const CLASSES = ['', 'weak', 'fair', 'good', 'strong'];

export default function PasswordMeter({ password }) {
  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="password-meter">
      <div className="password-meter__bars">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`password-meter__bar ${strength >= level ? CLASSES[strength] : ''}`}
          />
        ))}
      </div>
      <span className={`password-meter__label ${CLASSES[strength]}`}>
        {LABELS[strength]}
      </span>
    </div>
  );
}
