import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Hand, 
  Target, 
  UserCheck, 
  Sparkles,
  Maximize2,
  AlertTriangle,
  Play,
  Volume2
} from 'lucide-react';
import {
  ENABLE_CALIBRATION_MODAL,
  CALIBRATION_ENABLE_POSITIONING,
  CALIBRATION_ENABLE_REACHABILITY_TEST,
  CALIBRATION_ENABLE_HAND_GESTURE_TEST,
  CALIBRATION_REACH_TARGET_RADIUS,
  CALIBRATION_REACH_DWELL_MS,
  CALIBRATION_MIN_SHOULDER_WIDTH,
  CALIBRATION_ALLOW_SKIP
} from '../../constants';

// Predefined 5 interactive reach targets: Corners & Center
const REACH_TARGETS = [
  { id: 'top_left', label: '1. TOP LEFT', x: 0.15, y: 0.20, color: '#3B82F6', instruction: 'Reach your hand up to the TOP-LEFT target circle' },
  { id: 'top_right', label: '2. TOP RIGHT', x: 0.85, y: 0.20, color: '#10B981', instruction: 'Now reach up to the TOP-RIGHT target circle' },
  { id: 'bottom_right', label: '3. BOTTOM RIGHT', x: 0.85, y: 0.80, color: '#F59E0B', instruction: 'Reach down to the BOTTOM-RIGHT target circle' },
  { id: 'bottom_left', label: '4. BOTTOM LEFT', x: 0.15, y: 0.80, color: '#EC4899', instruction: 'Reach down to the BOTTOM-LEFT target circle' },
  { id: 'center', label: '5. CENTER', x: 0.50, y: 0.50, color: '#8B5CF6', instruction: 'Return your hand to the CENTER circle' }
];

export default function GameCalibrationModal({
  isOpen,
  onClose,
  onComplete,
  handState,        // Ref or object: { Left: { pos, smoothPos, closed, visible }, Right: { pos, smoothPos, closed, visible } }
  poseLandmarks,    // MediaPipe pose landmarks
  isDarkMode = false,
  gameTitle = 'Therapy Game'
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const isMountedRef = useRef(true);

  // Calibration Steps: 0: Positioning, 1: Reachability Matrix, 2: Hand Gesture, 3: Complete
  const [step, setStep] = useState(0); 

  // Step 1: Body Positioning State
  const [positionFeedback, setPositionFeedback] = useState({
    ready: false,
    message: 'Stand/sit so your upper body is centered in front of the camera.'
  });

  // Step 2: Reachability Targets State
  const [activeTargetIdx, setActiveTargetIdx] = useState(0);
  const [completedTargets, setCompletedTargets] = useState([]);
  const reachProgressRef = useRef(0); // 0..1 dwell progress
  const dwellStartTimeRef = useRef(null);
  const reachRecordedPointsRef = useRef([]);

  // Step 3: Gesture Assessment State
  const [gesturePhase, setGesturePhase] = useState('prompt_open'); // 'prompt_open' -> 'holding_open' -> 'prompt_close' -> 'holding_close' -> 'done'
  const [gestureHoldProgress, setGestureHoldProgress] = useState(0);
  const gestureTimerRef = useRef(null);
  const gestureSuccessRef = useRef({ canOpen: false, canClose: false });

  // Calibrated Output Envelope
  const [calibratedBounds, setCalibratedBounds] = useState(null);

  // Audio tone feedback for interactive confirmation
  const playChime = useCallback((type = 'hit') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'hit') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (gestureTimerRef.current) clearInterval(gestureTimerRef.current);
    };
  }, []);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(CALIBRATION_ENABLE_POSITIONING ? 0 : 1);
      setActiveTargetIdx(0);
      setCompletedTargets([]);
      reachProgressRef.current = 0;
      dwellStartTimeRef.current = null;
      reachRecordedPointsRef.current = [];
      setGesturePhase('prompt_open');
      setGestureHoldProgress(0);
      gestureSuccessRef.current = { canOpen: false, canClose: false };
      setCalibratedBounds(null);
    }
  }, [isOpen]);

  // ─── Continuous 60 FPS Interactive Canvas Render Loop ───────────────────────
  useEffect(() => {
    if (!isOpen || !ENABLE_CALIBRATION_MODAL) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      if (!isMountedRef.current || !isOpen) return;

      // Handle high-DPI scaling
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Extract current active hand positions
      const currentHands = [];
      const hs = typeof handState === 'function' ? handState() : handState;
      if (hs) {
        if (hs.Right?.visible && (hs.Right.smoothPos || hs.Right.pos)) {
          currentHands.push({ ...hs.Right, label: 'Right', p: hs.Right.smoothPos || hs.Right.pos });
        }
        if (hs.Left?.visible && (hs.Left.smoothPos || hs.Left.pos)) {
          currentHands.push({ ...hs.Left, label: 'Left', p: hs.Left.smoothPos || hs.Left.pos });
        }
      }

      // ─── STAGE 0: Body Framing Guide ──────────────────────────────────────
      if (step === 0) {
        // Draw center ideal guide box
        const boxW = width * 0.45;
        const boxH = height * 0.70;
        const boxX = (width - boxW) / 2;
        const boxY = (height - boxH) / 2;

        ctx.strokeStyle = positionFeedback.ready ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        // Evaluate Pose Landmarks for distance & center
        const pl = typeof poseLandmarks === 'function' ? poseLandmarks() : poseLandmarks;
        let currentMidX = 0.5;
        let shDist = 0.35;
        let normDist = 0.5;
        let isXOk = false;
        let isDistOk = false;

        if (pl && pl.length > 12) {
          const lSh = pl[11];
          const rSh = pl[12];
          if (lSh && rSh && lSh.visibility > 0.35 && rSh.visibility > 0.35) {
            shDist = Math.abs(lSh.x - rSh.x);
            currentMidX = (lSh.x + rSh.x) / 2;

            normDist = (shDist - 0.15) / (0.55 - 0.15);
            normDist = Math.max(0.05, Math.min(0.95, normDist));

            isXOk = currentMidX >= 0.40 && currentMidX <= 0.60;
            isDistOk = shDist >= 0.25 && shDist <= 0.48;

            if (!isDistOk) {
              setPositionFeedback({ 
                ready: false, 
                message: shDist < 0.25 
                  ? '🔍 Too Far from Lens! Move closer to laptop.' 
                  : '⚠️ Too Close to Lens! Step back or push laptop away.' 
              });
            } else if (!isXOk) {
              setPositionFeedback({ 
                ready: false, 
                message: currentMidX < 0.40 
                  ? '👈 Move laptop/body LEFT to center (X)' 
                  : '👉 Move laptop/body RIGHT to center (X)' 
              });
            } else {
              setPositionFeedback({ ready: true, message: '✅ Distance & Position Locked! Body positioning is optimal.' });
            }
          }
        }

        // ─── 1. HORIZONTAL X-AXIS SLIDER GAUGE (Bottom) ───
        const xSliderW = Math.min(boxW, 360);
        const xSliderH = 32;
        const xSliderX = (width - xSliderW) / 2;
        const xSliderY = boxY + boxH + 16;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.roundRect(xSliderX, xSliderY, xSliderW, xSliderH, 12);
        ctx.fill();
        ctx.strokeStyle = isXOk ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // X Target Green Zone [40% - 60%]
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fillRect(xSliderX + xSliderW * 0.40, xSliderY + 4, xSliderW * 0.20, xSliderH - 8);

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(xSliderX + xSliderW / 2, xSliderY + 6);
        ctx.lineTo(xSliderX + xSliderW / 2, xSliderY + xSliderH - 6);
        ctx.stroke();

        // X Needle
        const clampedX = Math.max(0.05, Math.min(0.95, currentMidX));
        const needleX = xSliderX + (xSliderW * clampedX);
        ctx.beginPath();
        ctx.arc(needleX, xSliderY + xSliderH / 2, 9, 0, Math.PI * 2);
        ctx.fillStyle = isXOk ? '#10B981' : '#F59E0B';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '900 10px system-ui';
        ctx.fillStyle = isXOk ? '#10B981' : 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'left';
        ctx.fillText('◄ L (X)', xSliderX + 10, xSliderY + 21);
        ctx.textAlign = 'right';
        ctx.fillText('(X) R ►', xSliderX + xSliderW - 10, xSliderY + 21);
        ctx.textAlign = 'center';
        ctx.fillText(isXOk ? '✓ X CENTERED' : 'HORIZONTAL (X)', xSliderX + xSliderW / 2, xSliderY + 21);

        // ─── 2. VERTICAL CAMERA DISTANCE GAUGE (Right Meter - Z / Lens Proximity) ───
        const ySliderW = 44;
        const ySliderH = Math.min(boxH, 260);
        const ySliderX = boxX + boxW + 16;
        const ySliderY = boxY + (boxH - ySliderH) / 2;

        if (ySliderX + ySliderW < width) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.roundRect(ySliderX, ySliderY, ySliderW, ySliderH, 14);
          ctx.fill();
          ctx.strokeStyle = isDistOk ? 'rgba(16, 185, 129, 0.8)' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Target Distance Green Zone [32% - 68%]
          const distTargetStart = ySliderY + ySliderH * 0.32;
          const distTargetHeight = ySliderH * 0.36;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.fillRect(ySliderX + 4, distTargetStart, ySliderW - 8, distTargetHeight);

          // Center Ideal Tick
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(ySliderX + 6, ySliderY + ySliderH * 0.50);
          ctx.lineTo(ySliderX + ySliderW - 6, ySliderY + ySliderH * 0.50);
          ctx.stroke();

          // Distance Needle
          const needleDistY = ySliderY + (ySliderH * (1 - normDist));
          ctx.beginPath();
          ctx.arc(ySliderX + ySliderW / 2, needleDistY, 10, 0, Math.PI * 2);
          ctx.fillStyle = isDistOk ? '#10B981' : '#F59E0B';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.font = '900 8.5px system-ui';
          ctx.fillStyle = isDistOk ? '#10B981' : 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText('CLOSE', ySliderX + ySliderW / 2, ySliderY + 15);
          ctx.fillText('FAR', ySliderX + ySliderW / 2, ySliderY + ySliderH - 9);
          ctx.fillText(isDistOk ? '✓ IDEAL' : 'DISTANCE', ySliderX + ySliderW / 2, ySliderY + ySliderH / 2 + 3);
        }
      }

      // ─── STAGE 1: Interactive 5-Target Reach Matrix ────────────────────────
      if (step === 1 && CALIBRATION_ENABLE_REACHABILITY_TEST) {
        const currentTarget = REACH_TARGETS[activeTargetIdx];

        // Draw already completed targets (green checkmarks)
        completedTargets.forEach(t => {
          const tx = t.x * width;
          const ty = t.y * height;
          ctx.beginPath();
          ctx.arc(tx, ty, 32, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', tx, ty);
        });

        // Draw active target
        if (currentTarget) {
          const tx = currentTarget.x * width;
          const ty = currentTarget.y * height;
          const baseRadius = 42;

          // Outer glowing pulse ring
          const pulse = Math.sin(Date.now() / 200) * 6;
          ctx.beginPath();
          ctx.arc(tx, ty, baseRadius + 12 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = `${currentTarget.color}55`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Target circle background
          ctx.beginPath();
          ctx.arc(tx, ty, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = `${currentTarget.color}CC`;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Target label
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentTarget.label, tx, ty);

          // Check if any hand cursor is hovering over the target
          let isHovering = false;
          let activeHandPos = null;

          for (const h of currentHands) {
            const hx = h.p.x * width;
            const hy = h.p.y * height;
            const dist = Math.hypot(hx - tx, hy - ty);

            if (dist <= (baseRadius + 20)) {
              isHovering = true;
              activeHandPos = h.p;
              break;
            }
          }

          // Dwell progress calculation
          if (isHovering) {
            if (!dwellStartTimeRef.current) {
              dwellStartTimeRef.current = Date.now();
            }
            const elapsed = Date.now() - dwellStartTimeRef.current;
            reachProgressRef.current = Math.min(1, elapsed / CALIBRATION_REACH_DWELL_MS);

            // Draw radial fill progress ring
            ctx.beginPath();
            ctx.arc(tx, ty, baseRadius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * reachProgressRef.current));
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // When full dwell reached -> Target Completed!
            if (reachProgressRef.current >= 1) {
              playChime('hit');
              reachRecordedPointsRef.current.push({ ...currentTarget, actualX: activeHandPos.x, actualY: activeHandPos.y });
              setCompletedTargets(prev => [...prev, currentTarget]);
              dwellStartTimeRef.current = null;
              reachProgressRef.current = 0;

              if (activeTargetIdx + 1 < REACH_TARGETS.length) {
                setActiveTargetIdx(i => i + 1);
              } else {
                // All 5 targets reached!
                playChime('success');
                computeFinalCalibrationBounds();
                setStep(CALIBRATION_ENABLE_HAND_GESTURE_TEST ? 2 : 3);
              }
            }
          } else {
            dwellStartTimeRef.current = null;
            reachProgressRef.current = 0;
          }
        }
      }

      // ─── Render Live Hand Cursors & Reticle on Canvas ───────────────────────
      currentHands.forEach(h => {
        const hx = h.p.x * width;
        const hy = h.p.y * height;

        // Outer aura
        ctx.beginPath();
        ctx.arc(hx, hy, 24, 0, Math.PI * 2);
        ctx.fillStyle = h.closed ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
        ctx.fill();

        // Cursor center
        ctx.beginPath();
        ctx.arc(hx, hy, 12, 0, Math.PI * 2);
        ctx.fillStyle = h.closed ? '#EF4444' : '#3B82F6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${h.label} Hand ${h.closed ? '✊' : '🖐️'}`, hx, hy - 28);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, step, activeTargetIdx, completedTargets, handState, poseLandmarks, positionFeedback.ready, playChime]);

  // Compute calibrated workspace box from recorded points
  const computeFinalCalibrationBounds = () => {
    const pts = reachRecordedPointsRef.current;
    if (pts.length === 0) return;

    const xs = pts.map(p => p.actualX || p.x);
    const ys = pts.map(p => p.actualY || p.y);

    const minX = Math.max(0.05, Math.min(...xs) - 0.05);
    const maxX = Math.min(0.95, Math.max(...xs) + 0.05);
    const minY = Math.max(0.05, Math.min(...ys) - 0.05);
    const maxY = Math.min(0.95, Math.max(...ys) + 0.05);

    const data = {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      reachRadius: Math.max(0.2, (maxX - minX) / 2),
      assistiveModeRecommended: !gestureSuccessRef.current.canClose,
      canOpen: gestureSuccessRef.current.canOpen,
      canClose: gestureSuccessRef.current.canClose
    };
    setCalibratedBounds(data);
  };

  // ─── Hand Gesture Test Step Logic ──────────────────────────────────────────
  const startGestureTest = (phase) => {
    setGesturePhase(phase);
    setGestureHoldProgress(0);

    let progress = 0;
    if (gestureTimerRef.current) clearInterval(gestureTimerRef.current);

    gestureTimerRef.current = setInterval(() => {
      const hs = typeof handState === 'function' ? handState() : handState;
      const anyHand = hs?.Right?.visible ? hs.Right : hs?.Left?.visible ? hs.Left : null;

      if (!anyHand) return;

      const isConditionMet = phase === 'holding_open' ? !anyHand.closed : anyHand.closed;

      if (isConditionMet) {
        progress += 20;
        setGestureHoldProgress(progress);
        if (progress >= 100) {
          clearInterval(gestureTimerRef.current);
          playChime('hit');
          if (phase === 'holding_open') {
            gestureSuccessRef.current.canOpen = true;
            setGesturePhase('prompt_close');
          } else {
            gestureSuccessRef.current.canClose = true;
            playChime('success');
            computeFinalCalibrationBounds();
            setStep(3); // Summary
          }
        }
      }
    }, 200);
  };

  // Finish calibration and propagate values
  const handleApplyCalibration = () => {
    const finalData = calibratedBounds || {
      minX: 0.1,
      maxX: 0.9,
      minY: 0.1,
      maxY: 0.9,
      centerX: 0.5,
      centerY: 0.5,
      reachRadius: 0.35,
      assistiveModeRecommended: false
    };
    if (onComplete) onComplete(finalData);
    if (onClose) onClose();
  };

  if (!isOpen || !ENABLE_CALIBRATION_MODAL) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col justify-between bg-black/40 backdrop-blur-sm pointer-events-auto select-none">
      
      {/* 60 FPS Interactive Full-Screen Canvas Overlay (Target Bubbles & Hand Cursor) */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10" 
      />

      {/* Top Floating Instruction HUD */}
      <div className="relative z-20 mx-auto mt-4 max-w-2xl w-full px-4">
        <div className="p-4 md:p-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary-500 text-white rounded-2xl shadow-md shrink-0">
              {step === 0 && <UserCheck size={24} />}
              {step === 1 && <Target size={24} />}
              {step === 2 && <Hand size={24} />}
              {step === 3 && <Sparkles size={24} />}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-primary-500">
                Step {step + 1} of 4 • {gameTitle}
              </div>
              <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white leading-tight">
                {step === 0 && 'Body Distance & Camera Alignment'}
                {step === 1 && (REACH_TARGETS[activeTargetIdx]?.instruction || 'Reach to Target')}
                {step === 2 && (gesturePhase.includes('open') ? 'Open Palm Test 🖐️' : 'Closed Fist Test ✊')}
                {step === 3 && 'Calibration Complete!'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {CALIBRATION_ALLOW_SKIP && step !== 3 && (
              <button
                type="button"
                onClick={handleApplyCalibration}
                className="px-3.5 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Close Calibration"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Center Interactive Guidance (Step-Specific Prompts) */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-4 pointer-events-none">
        
        {/* Step 0 Guidance Card */}
        {step === 0 && (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 text-center max-w-md pointer-events-auto space-y-4 animate-fade-in">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {positionFeedback.message}
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-3.5 px-6 bg-primary-500 hover:bg-primary-600 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
            >
              I Am Ready • Start Reach Test <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 Gesture Guidance Card */}
        {step === 2 && (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 text-center max-w-md pointer-events-auto space-y-4 animate-fade-in">
            {gesturePhase === 'prompt_open' && (
              <>
                <span className="text-5xl">🖐️</span>
                <h4 className="text-lg font-black dark:text-white">Show Open Palm</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open your hand wide and click start to test grasp mobility.</p>
                <button
                  type="button"
                  onClick={() => startGestureTest('holding_open')}
                  className="w-full py-3 bg-primary-500 text-white font-bold text-sm rounded-xl shadow-md hover:bg-primary-600 transition"
                >
                  Start Open Hand Test
                </button>
              </>
            )}

            {gesturePhase === 'holding_open' && (
              <>
                <span className="text-5xl animate-bounce">🖐️</span>
                <h4 className="text-lg font-black dark:text-white">Hold Open Palm...</h4>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-150" style={{ width: `${gestureHoldProgress}%` }} />
                </div>
              </>
            )}

            {gesturePhase === 'prompt_close' && (
              <>
                <span className="text-5xl">✊</span>
                <h4 className="text-lg font-black dark:text-white">Now Clench a Fist</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Close all fingers into a fist to verify active grip.</p>
                <button
                  type="button"
                  onClick={() => startGestureTest('holding_close')}
                  className="w-full py-3 bg-primary-500 text-white font-bold text-sm rounded-xl shadow-md hover:bg-primary-600 transition"
                >
                  Start Fist Test
                </button>
              </>
            )}

            {gesturePhase === 'holding_close' && (
              <>
                <span className="text-5xl animate-bounce">✊</span>
                <h4 className="text-lg font-black dark:text-white">Hold Fist Tight...</h4>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-150" style={{ width: `${gestureHoldProgress}%` }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 Final Summary Card */}
        {step === 3 && (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-gray-700 text-center max-w-lg pointer-events-auto space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
              <Sparkles size={32} />
            </div>

            <div>
              <h3 className="text-2xl font-black dark:text-white">Calibration Successful!</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your reachable workspace has been custom-mapped to your range of motion.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <span className="text-[10px] uppercase font-bold text-gray-400">Reachable Envelope</span>
                <div className="text-lg font-black text-primary-500 mt-0.5">
                  {calibratedBounds ? Math.round((calibratedBounds.maxX - calibratedBounds.minX) * 100) : 80}% Screen
                </div>
              </div>
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <span className="text-[10px] uppercase font-bold text-gray-400">Motor Assistance</span>
                <div className="text-lg font-black text-emerald-500 mt-0.5">
                  {calibratedBounds?.assistiveModeRecommended ? 'Assistive Mode' : 'Standard Grip'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCalibration}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl shadow-primary-500/25 transition flex items-center justify-center gap-2"
            >
              <Play size={20} /> Apply & Start Game
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status & Step Navigation Bar */}
      <div className="relative z-20 p-4 flex justify-center items-center">
        <div className="px-5 py-2.5 bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-3 shadow-lg">
          <span>Live Camera Calibration Active</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>
    </div>
  );
}
