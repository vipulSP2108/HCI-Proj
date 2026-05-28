import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [globalSettings, setGlobalSettings] = useState({
    testingMode: true,
    pianoSessionSeconds: 300,
    boardDrawingSessionSeconds: 300,
    fruitBasketSessionSeconds: 300,
    shapeTracingSessionSeconds: 300,
    inCamGameSessionSeconds: 300
  });

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      if (response.data) {
        setGlobalSettings(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch global settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ globalSettings, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
