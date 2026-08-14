import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [globalSettings, setGlobalSettings] = useState({
    testingMode: false,
    pianoSessionSeconds: 300,
    boardDrawingSessionSeconds: 300,
    fruitBasketSessionSeconds: 300,
    shapeTracingSessionSeconds: 300,
    inCamGameSessionSeconds: 300,
    fruitBasketCooldownSeconds: 3,
    fruitBasketMaxAttempts: 3,
    fruitBasketAttemptTimeoutSeconds: 10
  });

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      if (response.data) {
        const d = response.data;
        setGlobalSettings({
          testingMode:                    d.testingMode                    ?? true,
          pianoSessionSeconds:            d.pianoSessionSeconds            ?? 300,
          boardDrawingSessionSeconds:     d.boardDrawingSessionSeconds     ?? 300,
          fruitBasketSessionSeconds:      d.fruitBasketSessionSeconds      ?? 300,
          shapeTracingSessionSeconds:     d.shapeTracingSessionSeconds     ?? 300,
          inCamGameSessionSeconds:        d.inCamGameSessionSeconds        ?? 300,
          testingPianoDisabledKeys:       d.testingPianoDisabledKeys       ?? [],
          testingPianoKeyTimer:           d.testingPianoKeyTimer           ?? 5,
          testingPianoSequence:           d.testingPianoSequence           ?? [],
          testingPianoMobileSequence:     d.testingPianoMobileSequence     ?? [],
          testingShapeSequence:           d.testingShapeSequence           ?? [],
          testingFruitBasketSequence:     d.testingFruitBasketSequence     ?? [],
          boardDrawingAssistiveMode:      d.boardDrawingAssistiveMode      ?? true,
          fruitBasketCoordSampleMs:       d.fruitBasketCoordSampleMs       ?? 150,
          boardDrawingCoordSampleMs:      d.boardDrawingCoordSampleMs      ?? 150,
          testingShapeTimer:              d.testingShapeTimer              ?? 120,
          testingShapeSessionSeconds:     d.testingShapeSessionSeconds     ?? 600,
          testingPianoWristKeysCount:     d.testingPianoWristKeysCount     ?? 4,
          testingPianoWristTimer:         d.testingPianoWristTimer         ?? 5,
          testingPianoWristSequence:      d.testingPianoWristSequence      ?? [],
          // Fruit Fetch admin-configurable settings
          fruitBasketCooldownSeconds:     d.fruitBasketCooldownSeconds     ?? 3,
          fruitBasketMaxAttempts:         d.fruitBasketMaxAttempts         ?? 3,
          fruitBasketAttemptTimeoutSeconds: d.fruitBasketAttemptTimeoutSeconds ?? 10,
        });
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
