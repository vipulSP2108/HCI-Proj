import React from 'react';

const FullScreenLoader = ({ isSaving, text = "Saving Session..." }) => {
  if (!isSaving) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white'
    }}>
      <div style={{
        width: '60px', height: '60px', border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px'
      }}></div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{text}</h2>
      <p style={{ opacity: 0.8, marginTop: '10px' }}>Please wait while your progress is securely saved.</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default FullScreenLoader;
