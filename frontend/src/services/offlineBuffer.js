const OFFLINE_STORAGE_KEY = 'hci_offline_game_sessions';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const offlineBuffer = {
  /**
   * Retrieves all offline sessions from localStorage.
   */
  getSessions() {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Saves the current list of sessions back to localStorage.
   */
  _saveSessions(sessions) {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(sessions));
  },

  /**
   * Adds a new session to the offline buffer.
   * Calculates approximate size for UI display.
   */
  addSession(payload) {
    const sessions = this.getSessions();
    const id = generateId();
    const timestamp = new Date().toISOString();
    
    // Approximate size in KB
    const sizeInBytes = new Blob([JSON.stringify(payload)]).size;
    const sizeKB = (sizeInBytes / 1024).toFixed(1);

    const newSession = {
      id,
      timestamp,
      gameName: payload.gameName || 'Unknown Game',
      gameType: payload.gameType || 'unknown',
      sizeKB,
      payload,
      isPushed: false,
      pushedAt: null
    };

    sessions.push(newSession);
    this._saveSessions(sessions);
    return id;
  },

  /**
   * Marks a session as successfully pushed.
   * Records the time so it can be kept for 24 hours.
   */
  markAsPushed(id) {
    let sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      sessions[index].isPushed = true;
      sessions[index].pushedAt = new Date().toISOString();
      this._saveSessions(sessions);
    }
  },

  /**
   * Deletes a session entirely from the buffer (manual deletion or after auto-sync).
   */
  deleteSession(id) {
    let sessions = this.getSessions();
    sessions = sessions.filter(s => s.id !== id);
    this._saveSessions(sessions);
  },

  /**
   * Cleans up sessions that were pushed more than 24 hours ago.
   * Can be called periodically or on app load.
   */
  cleanup() {
    let sessions = this.getSessions();
    const now = new Date().getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    sessions = sessions.filter(s => {
      if (!s.isPushed || !s.pushedAt) return true;
      const pushedTime = new Date(s.pushedAt).getTime();
      return (now - pushedTime) < TWENTY_FOUR_HOURS_MS;
    });

    this._saveSessions(sessions);
  }
};

export default offlineBuffer;
