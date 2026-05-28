import React, { useState } from 'react';
import gameSessionBuffer from '../../services/gameSessionBuffer';
import { useNavigate } from 'react-router-dom';

/**
 * Sticky "Save & Exit" floating button for all games.
 * Shows a confirmation dialog, flushes local buffer to backend, then navigates back.
 */
const SaveExitButton = ({ onBeforeSave, onSaveStart, onSaveCancel, disabled }) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndExit = async () => {
    if (isSaving) return;

    if (onSaveStart) {
      onSaveStart();
    }

    const confirmed = window.confirm(
      'Save your session and exit the game?\n\nYour progress will be saved to your dashboard.'
    );
    if (!confirmed) {
      if (onSaveCancel) {
        onSaveCancel();
      }
      return;
    }

    setIsSaving(true);
    try {
      // Allow the parent game to finalize data before save
      if (onBeforeSave) {
        await onBeforeSave();
      }

      if (gameSessionBuffer.hasPending()) {
        const response = await gameSessionBuffer.saveAndExit();
        console.log('Session saved successfully:', response);
      }

      const { user } = JSON.parse(localStorage.getItem("user") || "{}");
      const dashPath = user?.type === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
      navigate(dashPath);
    } catch (error) {
      console.error('Failed to save session:', error);
      const exitAnyway = window.confirm(
        'Failed to save session to server.\n\nDo you want to exit without saving?'
      );
      if (exitAnyway) {
        gameSessionBuffer.discard();
        const { user } = JSON.parse(localStorage.getItem("user") || "{}");
        const dashPath = user?.type === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
        navigate(dashPath);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSaveAndExit}
      disabled={disabled || isSaving}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 24px',
        background: isSaving
          ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        fontSize: '15px',
        fontWeight: '700',
        cursor: isSaving ? 'wait' : 'pointer',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4), 0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.02em',
        backdropFilter: 'blur(8px)',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isSaving && !disabled) {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.5), 0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.4), 0 2px 8px rgba(0,0,0,0.1)';
      }}
    >
      {isSaving ? (
        <>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '18px' }}>⏳</span>
          Saving...
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>💾</span>
          Save & Exit
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </button>
  );
};

export default SaveExitButton;
