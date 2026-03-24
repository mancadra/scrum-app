import React, { useState, useEffect } from 'react';
import { getMFAFactors, enrollMFA, verifyMFAEnrollment, unenrollMFA } from '../services/auth';
import './MFASetup.css';

export default function MFASetup({ onClose }) {
  const [status, setStatus] = useState('loading'); // loading | disabled | enrolling | enabled
  const [enrolledFactorId, setEnrolledFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [pendingFactorId, setPendingFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const factors = await getMFAFactors();
        const verified = factors.find(f => f.status === 'verified');
        if (verified) {
          setEnrolledFactorId(verified.id);
          setStatus('enabled');
        } else {
          setStatus('disabled');
        }
      } catch {
        setStatus('disabled');
      }
    }
    load();
  }, []);

  async function handleStartEnroll() {
    setError('');
    setLoading(true);
    try {
      const { factorId, qrCode: qr, secret: sec } = await enrollMFA();
      setPendingFactorId(factorId);
      setQrCode(qr);
      setSecret(sec);
      setStatus('enrolling');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMFAEnrollment(pendingFactorId, code.trim());
      setEnrolledFactorId(pendingFactorId);
      setStatus('enabled');
      setCode('');
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnenroll() {
    setError('');
    setLoading(true);
    try {
      await unenrollMFA(enrolledFactorId);
      setEnrolledFactorId(null);
      setStatus('disabled');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mfa-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mfa-modal">
        <button className="mfa-close" type="button" onClick={onClose} aria-label="Zapri">✕</button>
        <h2 className="mfa-title">Dvostopenjska Avtentikacija (2FA)</h2>

        {status === 'loading' && <p className="mfa-text">Nalaganje...</p>}

        {status === 'disabled' && (
          <>
            <p className="mfa-text">2FA trenutno ni aktivna na vašem računu.</p>
            <button className="mfa-button" onClick={handleStartEnroll} disabled={loading}>
              {loading ? 'Pripravljanje...' : 'Aktiviraj 2FA'}
            </button>
          </>
        )}

        {status === 'enrolling' && (
          <>
            <p className="mfa-text">Skenirajte QR kodo s aplikacijo za avtentikacijo (npr. Google Authenticator, Authy).</p>
            {qrCode && <img className="mfa-qr" src={qrCode} alt="QR koda za 2FA" />}
            {secret && (
              <p className="mfa-secret">
                Ročni vnos: <code>{secret}</code>
              </p>
            )}
            <form onSubmit={handleVerify} className="mfa-verify-form">
              <label className="mfa-label" htmlFor="mfa-code">Potrdite z TOTP kodo</label>
              <input
                className="mfa-input"
                id="mfa-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                required
              />
              <button className="mfa-button" type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Preverjanje...' : 'Potrdi in Aktiviraj'}
              </button>
            </form>
          </>
        )}

        {status === 'enabled' && (
          <>
            <p className="mfa-text mfa-text--success">2FA je aktivna na vašem računu.</p>
            <button className="mfa-button mfa-button--danger" onClick={handleUnenroll} disabled={loading}>
              {loading ? 'Onemogočanje...' : 'Onemogoči 2FA'}
            </button>
          </>
        )}

        {error && <p className="mfa-error">{error}</p>}
      </div>
    </div>
  );
}
