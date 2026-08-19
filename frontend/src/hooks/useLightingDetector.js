import { useState, useRef, useCallback } from 'react';
import { getLightingDetectionSettings } from '../components/common/LightingSettings';

// Shared offscreen canvas — created once, reused for all checks.
let _sharedCanvas = null;
const measureLuminance = (videoElement) => {
  if (!_sharedCanvas) {
    _sharedCanvas = document.createElement('canvas');
    _sharedCanvas.width = 50;
    _sharedCanvas.height = 50;
  }
  const ctx = _sharedCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoElement, 0, 0, 50, 50);
  const data = ctx.getImageData(0, 0, 50, 50).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4);
};

export const useLightingDetector = () => {
  const [isPoorLighting, setIsPoorLighting] = useState(false);
  const frameCountRef = useRef(0);
  // Once lighting is confirmed good with ONLY_ON_START=true, stop forever.
  const doneRef = useRef(false);

  // Call this inside your existing MediaPipe onHandsResults callback.
  // Zero extra camera cost — piggybacks on frames MediaPipe already captured.
  //
  // Phase 1 — Priority initial check:
  //   Fires on frame 1 unconditionally (bypasses the frame-skip counter).
  //   This is the earliest possible moment a valid video frame exists.
  //
  // Phase 2 — Ongoing periodic check:
  //   After frame 1, checks every N frames based on user settings in localStorage.
  const checkFrame = useCallback((videoElement) => {
    // Dynamically retrieve user preferences from localStorage (or fallback constants)
    const settings = getLightingDetectionSettings();

    if (!settings.enabled || doneRef.current) return;
    if (!videoElement || videoElement.readyState < 2) return;

    frameCountRef.current++;
    const frame = frameCountRef.current;

    // Phase 1: always run on frame 1 (highest priority, before any interval kicks in)
    // Phase 2: run every N frames thereafter
    const shouldCheck = frame === 1 || frame % settings.framesBetweenChecks === 0;
    if (!shouldCheck) return;

    try {
      const avg = measureLuminance(videoElement);
      if (avg < settings.threshold) {
        setIsPoorLighting(true);
      } else {
        setIsPoorLighting(false);
        // If ONLY_ON_START is on, stop all future checks after first good reading.
        if (settings.onlyOnStart) {
          doneRef.current = true;
        }
      }
    } catch (err) {
      // Frame not ready — silently skip.
    }
  }, []);

  return { isPoorLighting, checkFrame };
};
