import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  RotateCcw, 
  Compass, 
  FastForward, 
  Hand, 
  Target, 
  UserCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  ENABLE_LIGHTING_DETECTION,
  LIGHTING_DETECTION_THRESHOLD,
  LIGHTING_DETECTION_ONLY_ON_START,
  LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS,
  ENABLE_CALIBRATION_MODAL,
  CALIBRATION_AUTO_ADVANCE,
  CALIBRATION_ENABLE_POSITIONING,
  CALIBRATION_ENABLE_REACHABILITY_TEST,
  CALIBRATION_ENABLE_HAND_GESTURE_TEST
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

export const getCalibrationSettings = () => {
  try {
    const savedEnabled = localStorage.getItem('hci_calibration_enabled');
    const savedAutoAdvance = localStorage.getItem('hci_calibration_auto_advance');
    const savedPositioning = localStorage.getItem('hci_calibration_enable_positioning');
    const savedReach = localStorage.getItem('hci_calibration_enable_reachability');
    const savedGrasp = localStorage.getItem('hci_calibration_enable_grasp');

    return {
      enabled: savedEnabled !== null ? savedEnabled === 'true' : ENABLE_CALIBRATION_MODAL,
      autoAdvance: savedAutoAdvance !== null ? savedAutoAdvance === 'true' : CALIBRATION_AUTO_ADVANCE,
      enablePositioning: savedPositioning !== null ? savedPositioning === 'true' : CALIBRATION_ENABLE_POSITIONING,
      enableReachability: savedReach !== null ? savedReach === 'true' : CALIBRATION_ENABLE_REACHABILITY_TEST,
      enableGrasp: savedGrasp !== null ? savedGrasp === 'true' : CALIBRATION_ENABLE_HAND_GESTURE_TEST,
    };
  } catch (err) {
    return {
      enabled: ENABLE_CALIBRATION_MODAL,
      autoAdvance: CALIBRATION_AUTO_ADVANCE,
      enablePositioning: CALIBRATION_ENABLE_POSITIONING,
      enableReachability: CALIBRATION_ENABLE_REACHABILITY_TEST,
      enableGrasp: CALIBRATION_ENABLE_HAND_GESTURE_TEST,
    };
  }
};

const LightingSettings = ({ isDarkMode }) => {
  // Lighting State
  const [enabled, setEnabled] = useState(ENABLE_LIGHTING_DETECTION);
  const [threshold, setThreshold] = useState(LIGHTING_DETECTION_THRESHOLD);
  const [onlyOnStart, setOnlyOnStart] = useState(LIGHTING_DETECTION_ONLY_ON_START);
  const [frames, setFrames] = useState(LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS);
  
  // Calibration State
  const [calibEnabled, setCalibEnabled] = useState(ENABLE_CALIBRATION_MODAL);
  const [autoAdvance, setAutoAdvance] = useState(CALIBRATION_AUTO_ADVANCE);
  const [calibPositioning, setCalibPositioning] = useState(CALIBRATION_ENABLE_POSITIONING);
  const [calibReach, setCalibReach] = useState(CALIBRATION_ENABLE_REACHABILITY_TEST);
  const [calibGrasp, setCalibGrasp] = useState(CALIBRATION_ENABLE_HAND_GESTURE_TEST);

  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const l = getLightingDetectionSettings();
    setEnabled(l.enabled);
    setThreshold(l.threshold);
    setOnlyOnStart(l.onlyOnStart);
    setFrames(l.framesBetweenChecks);

    const c = getCalibrationSettings();
    setCalibEnabled(c.enabled);
    setAutoAdvance(c.autoAdvance);
    setCalibPositioning(c.enablePositioning);
    setCalibReach(c.enableReachability);
    setCalibGrasp(c.enableGrasp);
  }, []);

  const triggerSavedFeedback = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const saveLighting = (newEnabled, newThreshold, newOnlyOnStart, newFrames) => {
    try {
      localStorage.setItem('hci_lighting_enabled', String(newEnabled));
      localStorage.setItem('hci_lighting_threshold', String(newThreshold));
      localStorage.setItem('hci_lighting_only_on_start', String(newOnlyOnStart));
      localStorage.setItem('hci_lighting_frames', String(newFrames));
      triggerSavedFeedback();
    } catch (e) {
      console.error(e);
    }
  };

  const saveCalibration = (newEnabled, newAutoAdvance, newPos, newReach, newGrasp) => {
    try {
      localStorage.setItem('hci_calibration_enabled', String(newEnabled));
      localStorage.setItem('hci_calibration_auto_advance', String(newAutoAdvance));
      localStorage.setItem('hci_calibration_enable_positioning', String(newPos));
      localStorage.setItem('hci_calibration_enable_reachability', String(newReach));
      localStorage.setItem('hci_calibration_enable_grasp', String(newGrasp));
      triggerSavedFeedback();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutoAdvance = (mode) => {
    setAutoAdvance(mode);
    saveCalibration(calibEnabled, mode, calibPositioning, calibReach, calibGrasp);
  };

  const handleToggleCalibEnabled = () => {
    const next = !calibEnabled;
    setCalibEnabled(next);
    saveCalibration(next, autoAdvance, calibPositioning, calibReach, calibGrasp);
  };

  const handleToggleCalibStep = (step) => {
    let p = calibPositioning;
    let r = calibReach;
    let g = calibGrasp;
    if (step === 'positioning') p = !p;
    if (step === 'reach') r = !r;
    if (step === 'grasp') g = !g;

    setCalibPositioning(p);
    setCalibReach(r);
    setCalibGrasp(g);
    saveCalibration(calibEnabled, autoAdvance, p, r, g);
  };

  const handleResetDefaults = () => {
    setEnabled(ENABLE_LIGHTING_DETECTION);
    setThreshold(LIGHTING_DETECTION_THRESHOLD);
    setOnlyOnStart(LIGHTING_DETECTION_ONLY_ON_START);
    setFrames(LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS);
    saveLighting(
      ENABLE_LIGHTING_DETECTION,
      LIGHTING_DETECTION_THRESHOLD,
      LIGHTING_DETECTION_ONLY_ON_START,
      LIGHTING_DETECTION_FRAMES_BETWEEN_CHECKS
    );

    setCalibEnabled(ENABLE_CALIBRATION_MODAL);
    setAutoAdvance(CALIBRATION_AUTO_ADVANCE);
    setCalibPositioning(CALIBRATION_ENABLE_POSITIONING);
    setCalibReach(CALIBRATION_ENABLE_REACHABILITY_TEST);
    setCalibGrasp(CALIBRATION_ENABLE_HAND_GESTURE_TEST);
    saveCalibration(
      ENABLE_CALIBRATION_MODAL,
      CALIBRATION_AUTO_ADVANCE,
      CALIBRATION_ENABLE_POSITIONING,
      CALIBRATION_ENABLE_REACHABILITY_TEST,
      CALIBRATION_ENABLE_HAND_GESTURE_TEST
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black dark:text-white uppercase tracking-wider flex items-center gap-3">
            <Compass className="text-primary-500 w-6 h-6" />
            Camera & Pre-Game Calibration Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure markerless motion tracking, camera lighting, and step progression preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="text-xs font-bold text-green-500 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={14} /> Settings Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
        </div>
      </div>

      {/* ─── SECTION 1: PRE-GAME CALIBRATION WORKFLOW ─── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 text-primary-500 rounded-xl">
              <Target size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Pre-Game Calibration Flow
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Launch interactive calibration before games to map personalized reach and distance.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={calibEnabled}
              onChange={handleToggleCalibEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {calibEnabled && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-6">
            {/* Progression Mode Choice */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Phase Progression Preference
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleToggleAutoAdvance(true)}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                    autoAdvance
                      ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-900/20 ring-2 ring-primary-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${autoAdvance ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <FastForward size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Automatic Progression {autoAdvance && <CheckCircle2 size={14} className="text-primary-500" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Smoothly auto-advances to the next phase when posture, corner reach, and grasp are fulfilled.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleAutoAdvance(false)}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                    !autoAdvance
                      ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-900/20 ring-2 ring-primary-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${!autoAdvance ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <Hand size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Manual Step Buttons {!autoAdvance && <CheckCircle2 size={14} className="text-primary-500" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Displays an explicit "Next Phase" confirmation button at every step for complete manual pacing.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Individual Calibration Steps */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Included Calibration Steps
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <UserCheck size={18} className="text-primary-500" />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Step 1: Distance & Alignment Gauges</div>
                      <div className="text-[11px] text-gray-500">Horizontal (X) and Lens Distance (Z) positioning checks</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={calibPositioning}
                    onChange={() => handleToggleCalibStep('positioning')}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Step 2: 5-Point Reach Matrix</div>
                      <div className="text-[11px] text-gray-500">4 corners + center interactive touch targets for Range of Motion</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={calibReach}
                    onChange={() => handleToggleCalibStep('reach')}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Hand size={18} className="text-purple-500" />
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">Step 3: Hand Grasp & Mobility Assessment</div>
                      <div className="text-[11px] text-gray-500">Open palm vs closed fist testing for automatic Assistive Mode</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={calibGrasp}
                    onChange={() => handleToggleCalibStep('grasp')}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── SECTION 2: LIGHTING ASSURANCE ─── */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-xl">
              <Sun size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Ambient Lighting Verification
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Warns when ambient light is insufficient for reliable computer vision tracking.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => {
                const next = !enabled;
                setEnabled(next);
                saveLighting(next, threshold, onlyOnStart, frames);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {enabled && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg">
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Check Only on Start (Power Saver)
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-700/50">
                      Recommended
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    Verify lighting once at launch, then disable checks to free 100% of CPU for tracking.
                  </div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={onlyOnStart}
                  onChange={() => {
                    const next = !onlyOnStart;
                    setOnlyOnStart(next);
                    saveLighting(enabled, threshold, next, frames);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default LightingSettings;
