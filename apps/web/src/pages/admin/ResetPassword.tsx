import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ResetPassword: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ available: boolean; username?: string; message?: string; resetAt?: string } | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [focused, setFocused] = useState<string | null>(null);

  const navigate = useNavigate();

  // Check reset password availability status on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/reset-password/status`)
      .then(async (res) => {
        const data = await res.json();
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setStatus({ available: false, message: 'Could not connect to command headquarters.' });
        setLoading(false);
      });
  }, []);

  // Automatic countdown redirect on success
  useEffect(() => {
    if (success) {
      if (countdown <= 0) {
        navigate('/admin');
        return;
      }
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [success, countdown, navigate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      // Success: lock the page and show success screen
      setSuccess(true);
      setStatus({ available: false, message: 'Password has been reset.' });
    } catch (err: any) {
      setError(err.message || 'An error occurred during password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: '#040302' }}>

      {/* ── Global Error Toast ── */}
      <div 
        className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 pointer-events-none flex items-center gap-3 ${error ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}
        style={{
          background: 'linear-gradient(to bottom, rgba(70, 10, 10, 0.95), rgba(40, 5, 5, 0.98))',
          border: '1px solid #C9A24A',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding: '10px 24px',
          borderRadius: '6px',
        }}
      >
        <svg style={{ width: '20px', height: '20px', color: '#E4C76A' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span style={{
          color: '#F4E6C2',
          fontSize: '13px',
          fontFamily: '"Cinzel", serif',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)'
        }}>
          {error}
        </span>
      </div>

      {/* ── BG Layer 1: Pirate World ── */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'url("/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.38,
      }} />

      {/* ── BG Layer 2: Vignette + Radial Darkening ── */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(4,3,2,0.4) 55%, rgba(4,3,2,0.85) 100%),
          linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)
        `,
      }} />

      {/* ── BG Layer 3: Contact shadow zone behind scroll ── */}
      <div className="absolute" style={{
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(50vw, 700px)',
        height: 'min(60vh, 700px)',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Foreground: Wooden Scroll Container ── */}
      <div className="relative z-10" style={{
        height: 'min(86vh, 900px)',
        width: 'auto',
        maxWidth: '90vw',
        transform: 'perspective(1400px) translateZ(18px)',
        filter: `
          drop-shadow(0 4px 6px rgba(0,0,0,0.55))
          drop-shadow(0 12px 18px rgba(0,0,0,0.45))
          drop-shadow(0 28px 45px rgba(0,0,0,0.35))
          drop-shadow(0 2px 8px rgba(0,0,0,0.3))
          drop-shadow(0 0 12px rgba(210,160,70,0.08))
        `,
      }}>
        {/* Warm light overlay on the scroll */}
        <div className="absolute inset-0 pointer-events-none rounded-none z-20" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(255,220,150,0.06) 0%, transparent 70%)',
          mixBlendMode: 'screen',
        }} />

        {/* Scroll Background Image */}
        <img
          src="/woodenscrool.png"
          alt=""
          className="select-none pointer-events-none"
          draggable={false}
          style={{
            height: '100%',
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
            filter: 'brightness(1.08) contrast(1.04)',
          }}
        />

        {/* ── Parchment Content Layer ── */}
        <div className="absolute flex flex-col items-center justify-center" style={{
          top: '14%',
          left: '14%',
          width: '72%',
          height: '72%',
          overflow: 'hidden',
          paddingTop: 'clamp(8px, 1.8vw, 24px)',
          paddingBottom: 'clamp(14px, 2.5vw, 32px)',
        }}>
          <div style={{
            width: '72%',
            maxWidth: '380px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>

            {/* Header / Brand */}
            <h1 style={{
              fontFamily: '"Cinzel Decorative", serif',
              fontSize: 'clamp(16px, 2.2vw, 26px)',
              fontWeight: 700,
              color: '#3A200D',
              letterSpacing: '0.12em',
              textShadow: '0 1px 0 rgba(232,208,154,0.5)',
              lineHeight: 1.1,
              margin: 0,
            }}>
              ECHONA
            </h1>
            <div className="flex items-center justify-center" style={{ gap: '6px', margin: '4px 0' }}>
              <div style={{ height: '1px', width: '28px', background: 'linear-gradient(to right, transparent, #8C6D46, transparent)' }} />
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#8C6D46" style={{ flexShrink: 0, opacity: 0.6 }}>
                <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
              </svg>
              <div style={{ height: '1px', width: '28px', background: 'linear-gradient(to left, transparent, #8C6D46, transparent)' }} />
            </div>
            <p style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 'clamp(8px, 0.75vw, 11px)',
              fontWeight: 700,
              color: '#5C3A1E',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}>
              One-Time Vault
            </p>

            {/* ── State 1: Checking Status ── */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-8 h-8 border-2 border-[#8C6D46]/40 border-t-[#3A200D] rounded-full animate-spin" />
                <p style={{ fontFamily: '"Cinzel", serif', fontSize: '11px', color: '#5C3A1E', letterSpacing: '0.15em', fontWeight: 600 }}>
                  INSPECTING VAULT SEAL...
                </p>
              </div>
            )}

            {/* ── State 2: Success Screen ── */}
            {!loading && success && (
              <div className="w-full flex flex-col items-center text-center space-y-4 py-2">
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1A472A, #0D2415)',
                  border: '2px solid #C7A04A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}>
                  <svg className="w-6 h-6 text-[#E2C36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h2 style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#2B1710',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>
                    CREDENTIALS FORGED & SEALED
                  </h2>
                  <p style={{
                    fontSize: '11px',
                    color: '#5C3A1E',
                    lineHeight: 1.5,
                    marginTop: '4px',
                  }}>
                    The Captain's password has been updated. This one-time passage is now permanently sealed forever.
                  </p>
                </div>

                <div style={{
                  background: 'rgba(23, 16, 12, 0.08)',
                  border: '1px dashed #8C6D46',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#4A2E15',
                  fontWeight: 600,
                }}>
                  Redirecting to Command Center in {countdown}s...
                </div>

                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '5px',
                    background: 'linear-gradient(to bottom, #741714, #4A0E0C)',
                    border: '1.5px solid #C9A24A',
                    color: '#F4E6C2',
                    fontFamily: '"Cinzel", serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  PROCEED TO LOGIN NOW
                </button>
              </div>
            )}

            {/* ── State 3: Permanently Sealed (Already Used / Unavailable) ── */}
            {!loading && !success && status && !status.available && (
              <div className="w-full flex flex-col items-center text-center space-y-4 py-2">
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3D100E, #1F0807)',
                  border: '2px solid #C7A04A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                }}>
                  <svg className="w-7 h-7 text-[#E2C36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <div>
                  <h2 style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#741714',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>
                    VAULT PERMANENTLY SEALED
                  </h2>
                  <p style={{
                    fontSize: '11px',
                    color: '#4A2E15',
                    lineHeight: 1.5,
                    marginTop: '6px',
                  }}>
                    This emergency one-time password reset link has already been opened and used.
                  </p>
                  <p style={{
                    fontSize: '10px',
                    color: '#7A522A',
                    fontStyle: 'italic',
                    marginTop: '4px',
                  }}>
                    For safety and integrity, this passage can never be opened again.
                  </p>
                </div>

                {status.resetAt && (
                  <div style={{
                    fontSize: '10px',
                    color: '#8C6D46',
                    fontFamily: '"Cinzel", serif',
                    letterSpacing: '0.05em',
                  }}>
                    SEALED ON: {new Date(status.resetAt).toLocaleString()}
                  </div>
                )}

                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '5px',
                    background: 'linear-gradient(to bottom, #2B1710, #17100C)',
                    border: '1.5px solid #C9A24A',
                    color: '#E7D19A',
                    fontFamily: '"Cinzel", serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  RETURN TO LOGIN
                </button>
              </div>
            )}

            {/* ── State 4: Available Form ── */}
            {!loading && !success && status && status.available && (
              <form onSubmit={handleSubmit} className="w-full flex flex-col" style={{ gap: '14px' }}>
                
                {/* One-time Warning Banner */}
                <div style={{
                  background: 'linear-gradient(to bottom, rgba(60, 10, 10, 0.95), rgba(35, 5, 5, 0.98))',
                  border: '1px solid #C7A04A',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div className="flex items-center justify-center gap-1.5 text-[#E2C36A] font-bold text-[10px] uppercase tracking-wider" style={{ fontFamily: '"Cinzel", serif' }}>
                    <svg className="w-3.5 h-3.5 text-[#E2C36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    LIFETIME PASSAGE WARNING
                  </div>
                  <p className="text-[9.5px] text-[#F4E7C7]/90 leading-tight mt-1">
                    This page will ONLY open once in its lifetime. Upon reset, it will be sealed forever.
                  </p>
                </div>

                {/* Target Admin Indicator */}
                <div className="flex items-center justify-between px-1" style={{ fontSize: '11px', color: '#5C3A1E' }}>
                  <span style={{ fontFamily: '"Cinzel", serif', fontWeight: 700, letterSpacing: '0.1em' }}>TARGET CREW:</span>
                  <span className="font-bold text-[#741714] uppercase tracking-wider">Captain @{status.username || 'admin'}</span>
                </div>

                {/* New Password Input */}
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: '"Cinzel", serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4A2E15',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}>
                    New Password
                  </label>
                  <div className="relative" style={{
                    borderRadius: '5px',
                    background: 'linear-gradient(to bottom, #150A04, #1E120A, #24140D)',
                    border: `1.5px solid ${focused === 'newPass' ? '#E4C76A' : '#9A7B50'}`,
                    height: '42px',
                    boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.85)',
                  }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setFocused('newPass')}
                      onBlur={() => setFocused(null)}
                      required
                      placeholder="Min 6 characters"
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '0 40px 0 14px',
                        color: '#F4E6C2',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.1em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9A7B50', padding: 0,
                      }}
                    >
                      {showPassword ? (
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: '"Cinzel", serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4A2E15',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}>
                    Confirm Password
                  </label>
                  <div className="relative" style={{
                    borderRadius: '5px',
                    background: 'linear-gradient(to bottom, #150A04, #1E120A, #24140D)',
                    border: `1.5px solid ${focused === 'confirmPass' ? '#E4C76A' : '#9A7B50'}`,
                    height: '42px',
                    boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.85)',
                  }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocused('confirmPass')}
                      onBlur={() => setFocused(null)}
                      required
                      placeholder="Repeat password"
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '0 40px 0 14px',
                        color: '#F4E6C2',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.1em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9A7B50', padding: 0,
                      }}
                    >
                      {showConfirm ? (
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '5px',
                    background: 'linear-gradient(to bottom, #741714, #4A0E0C)',
                    border: '1.5px solid #C9A24A',
                    color: '#F4E6C2',
                    fontFamily: '"Cinzel", serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#F4E6C2]/40 border-t-[#F4E6C2] rounded-full animate-spin" />
                      <span>SEALING VAULT...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-[#E2C36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>SEAL & RESET PASSWORD</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
