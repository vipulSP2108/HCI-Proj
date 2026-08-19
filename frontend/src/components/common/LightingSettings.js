import React, { useState, useEffect } from 'react';
import { Sun, Moon, Cpu, Sliders, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  ENABLE_LIGHTING_DETECTION,
  LIGHTING_DETECTION_THRESHOLD,
  LIGHTING_DETECTION_ONLY_ON_START,
  LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS
} from '../../constants';

export const getLightingDetectionSettings = () => {
  try {
    const savedEnabled = localStorage.getItem('hci_lighting_enabled');
    const savedThreshold = localStorage.getItem('hci_lighting_threshold');
    const savedOnlyOnStart = localStorage.getItem('hci_lighting_only_on_start');
    const savedFrames = localStorage.getItem('hci_lighting_frames');

    return {
      enabled: savedEnabled !== null ? savedEnabled === 'true' : ENABLE_LIGHTING_DETECTION,
      threshold: savedThreshold !== null ? Number(savedThreshold) : LIGHTING_DETECTION_THRESHOLD,
      onlyOnStart: savedOnlyOnStart !== null ? savedOnlyOnStart === 'true' : LIGHTING_DETECTION_ONLY_ON_START,
      framesBetweenChecks: savedFrames !== null ? Number(savedFrames) : LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS,
    };
  } catch (err) {
    return {
      enabled: ENABLE_LIGHTING_DETECTION,
      threshold: LIGHTING_DETECTION_THRESHOLD,
      onlyOnStart: LIGHTING_DETECTION_ONLY_ON_START,
      framesBetweenChecks: LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS,
    };
  }
};

const LightingSettings = ({ isDarkMode }) => {
  const [enabled, setEnabled] = useState(ENABLE_LIGHTING_DETECTION);
  const [threshold, setThreshold] = useState(LIGHTING_DETECTION_THRESHOLD);
  const [onlyOnStart, setOnlyOnStart] = useState(LIGHTING_DETECTION_ONLY_ON_START);
  const [frames, setFrames] = useState(LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const s = getLightingDetectionSettings();
    setEnabled(s.enabled);
    setThreshold(s.threshold);
    setOnlyOnStart(s.onlyOnStart);
    setFrames(s.framesBetweenChecks);
  }, []);

  const saveSettings = (newEnabled, newThreshold, newOnlyOnStart, newFrames) => {
    try {
      localStorage.setItem('hci_lighting_enabled', String(newEnabled));
      localStorage.setItem('hci_lighting_threshold', String(newThreshold));
      localStorage.setItem('hci_lighting_only_on_start', String(newOnlyOnStart));
      localStorage.setItem('hci_lighting_frames', String(newFrames));

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } catch (e) {
      console.error("Failed to save lighting settings to localStorage:", e);
    }
  };

  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    saveSettings(next, threshold, onlyOnStart, frames);
  };

  const handleToggleOnlyOnStart = () => {
    const next = !onlyOnStart;
    setOnlyOnStart(next);
    saveSettings(enabled, threshold, next, frames);
  };

  const handleThresholdChange = (val) => {
    const num = Math.max(1, Math.min(100, Number(val)));
    setThreshold(num);
    saveSettings(enabled, num, onlyOnStart, frames);
  };

  const handleFramesChange = (val) => {
    const num = Number(val);
    setFrames(num);
    saveSettings(enabled, threshold, onlyOnStart, num);
  };

  const handleResetDefaults = () => {
    setEnabled(ENABLE_LIGHTING_DETECTION);
    setThreshold(LIGHTING_DETECTION_THRESHOLD);
    setOnlyOnStart(LIGHTING_DETECTION_ONLY_ON_START);
    setFrames(LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS);
    saveSettings(
      ENABLE_LIGHTING_DETECTION,
      LIGHTING_DETECTION_THRESHOLD,
      LIGHTING_DETECTION_ONLY_ON_START,
      LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black dark:text-white uppercase tracking-wider flex items-center gap-3">
            <Sun className="text-amber-500 w-6 h-6" />
            Camera Lighting & Quality Assurance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure real-time camera illumination analysis to ensure accurate hand tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="text-xs font-bold text-green-500 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
            title="Reset to default values"
          >
            <RotateCcw size={13} /> Reset Defaults
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle 1: Enable Lighting Detection */}
        <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 dark:bg-gray-800/80 rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 md:p-4 rounded-2xl ${enabled ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'} transition-colors`}>
              <Sun size={22} />
            </div>
            <div>
              <h4 className="text-base md:text-lg font-bold dark:text-white">
                Poor Lighting Alerts
              </h4>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Display warning when room is too dark for accurate MediaPipe hand tracking.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`w-14 h-8 shrink-0 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Toggle 2: Check Only at Start (CPU Optimization) */}
            <div className="flex items-center justify-between p-4 md:p-6 bg-gray-50 dark:bg-gray-800/80 rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 md:p-4 rounded-2xl ${onlyOnStart ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'} transition-colors`}>
                  <Cpu size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base md:text-lg font-bold dark:text-white">
                      Check Only on Start (Power Saver)
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    Verify lighting once at launch, then disable checks to free 100% of CPU for tracking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleOnlyOnStart}
                className={`w-14 h-8 shrink-0 rounded-full relative transition-colors duration-300 ${onlyOnStart ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
              >
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${onlyOnStart ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Slider: Darkness Threshold */}
            {/* <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-800/80 rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-gray-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-xl">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm md:text-base font-bold dark:text-white">
                      Darkness Sensitivity Threshold
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Lower values allow dimmer rooms before warning (0 = black, 255 = white).
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white dark:bg-gray-900 rounded-xl font-black text-sm text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700">
                  {threshold}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={threshold}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[11px] font-bold text-gray-400 px-1">
                  <span>5 (Pitch Dark)</span>
                  <span className="text-blue-500">15 (Default)</span>
                  <span>60 (Brightly Lit)</span>
                </div>
              </div>
            </div> */}

            {/* Selector: Ongoing Check Interval (Only visible if onlyOnStart is false) */}
            {/* {!onlyOnStart && (
              <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-800/80 rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-gray-700/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm md:text-base font-bold dark:text-white">
                      Periodic Check Interval
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How frequently lighting is sampled throughout active gameplay.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label: 'Every ~3s (90 frames)', value: 90 },
                    { label: 'Every ~5s (150 frames)', value: 150 },
                    { label: 'Every ~10s (300 frames)', value: 300 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFramesChange(opt.value)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all border ${frames === opt.value
                          ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )} */}
          </>
        )}
      </div>
    </section>
  );
};

export default LightingSettings;
