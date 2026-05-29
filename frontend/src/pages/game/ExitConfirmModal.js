import React from "react";

/**
 * ExitConfirmModal
 * Shows a single overlay with three clear choices:
 *   Save & Exit  |  Discard & Exit  |  Cancel
 *
 * Props:
 *   isOpen      {boolean}  – whether the modal is visible
 *   hasPending  {boolean}  – whether there is unsaved session data
 *   onSave      {function} – called when user picks "Save & Exit"
 *   onDiscard   {function} – called when user picks "Discard & Exit"
 *   onCancel    {function} – called when user picks "Cancel" (stay in game)
 */
const ExitConfirmModal = ({ isOpen, hasPending, onSave, onDiscard, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconWrap}>
          <span style={styles.icon}>🚪</span>
        </div>

        {/* Title */}
        <h2 style={styles.title}>Leave the Game?</h2>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          {hasPending
            ? "You have unsaved progress. What would you like to do?"
            : "No unsaved data. You can safely exit."}
        </p>

        {/* Buttons */}
        <div style={styles.btnGroup}>
          {/* Save & Exit — only shown when there's data to save */}
          {hasPending && (
            <button style={{ ...styles.btn, ...styles.btnSave }} onClick={onSave}>
              <span style={styles.btnIcon}>💾</span>
              <span>
                <strong>Save &amp; Exit</strong>
                <small style={styles.btnSub}>Upload session to server, then exit</small>
              </span>
            </button>
          )}

          {/* Discard & Exit */}
          <button style={{ ...styles.btn, ...styles.btnDiscard }} onClick={onDiscard}>
            <span style={styles.btnIcon}>🗑️</span>
            <span>
              <strong>{hasPending ? "Discard & Exit" : "Exit"}</strong>
              <small style={styles.btnSub}>
                {hasPending ? "Lose unsaved data and exit" : "Return to dashboard"}
              </small>
            </span>
          </button>

          {/* Cancel */}
          <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={onCancel}>
            <span style={styles.btnIcon}>↩️</span>
            <span>
              <strong>Stay in Game</strong>
              <small style={styles.btnSub}>Continue where you left off</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "fadeIn 0.18s ease",
  },
  card: {
    background: "linear-gradient(145deg, #1e2235, #252b42)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px",
    padding: "36px 32px 28px",
    width: "min(440px, 92vw)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#e8eaf0",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  icon: { fontSize: 32 },
  title: {
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: 700,
    letterSpacing: "-0.3px",
    color: "#fff",
  },
  subtitle: {
    margin: "2px 0 12px",
    fontSize: "0.88rem",
    color: "rgba(220,225,240,0.7)",
    textAlign: "center",
    lineHeight: 1.5,
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "13px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 0.15s, opacity 0.15s",
    width: "100%",
    fontSize: "0.92rem",
  },
  btnSave: {
    background: "linear-gradient(135deg, #1a7a4a, #22a05e)",
    color: "#fff",
  },
  btnDiscard: {
    background: "linear-gradient(135deg, #7a1a1a, #c0392b)",
    color: "#fff",
  },
  btnCancel: {
    background: "rgba(255,255,255,0.07)",
    color: "#cdd0e0",
  },
  btnIcon: { fontSize: 22, flexShrink: 0 },
  btnSub: {
    display: "block",
    fontSize: "0.75rem",
    opacity: 0.75,
    marginTop: 2,
    fontWeight: 400,
  },
};

export default ExitConfirmModal;
