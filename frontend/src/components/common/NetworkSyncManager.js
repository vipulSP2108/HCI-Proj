import React, { useEffect, useState } from 'react';
import offlineBuffer from '../../services/offlineBuffer';
import { gameService } from '../../services/gameService';
import api from '../../services/api';

const NetworkSyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Clean up pushed sessions older than 24 hours on mount
    offlineBuffer.cleanup();

    const handleOnline = async () => {
      setIsOnline(true);
      
      const autoSyncEnabled = localStorage.getItem('hci_auto_sync_buffer') !== 'false';
      if (!autoSyncEnabled) return;

      // Check connection speed
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      let isFastEnough = true;
      if (connection) {
        // e.g. 'slow-2g', '2g', '3g', '4g'
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          isFastEnough = false;
        }
        // Check if downlink is very slow (less than 1 Mbps)
        if (connection.downlink < 1.0) {
          isFastEnough = false;
        }
      }

      if (isFastEnough) {
        syncOfflineSessions();
        refreshUserData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check just in case we missed it
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineSessions = async () => {
    const sessions = offlineBuffer.getSessions();
    const unpushed = sessions.filter(s => !s.isPushed);

    for (const session of unpushed) {
      try {
        if (session.gameType === 'board_drawing') {
          await gameService.saveBoardDrawingSession(session.payload);
        } else {
          await gameService.saveGameSession(session.payload);
        }
        // Auto-sync requirement: "deletes ones entire data is been seed"
        offlineBuffer.deleteSession(session.id);
      } catch (err) {
        console.error('Auto-sync failed for session:', session.id, err);
      }
    }
  };

  const refreshUserData = async () => {
    // We can dispatch a custom event that dashboards can listen to
    // or we can refresh user data manually if stored in context.
    window.dispatchEvent(new Event('refresh_user_data'));
  };

  return null; // This is a logic-only component
};

export default NetworkSyncManager;
