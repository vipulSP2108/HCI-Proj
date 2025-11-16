import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import React, { useState, useEffect, useRef, useCallback } from 'react';
// ==================== CONFIGURATION ====================
const CONFIG = {
  SESSION_SECONDS: 300,
  CALIBRATION_SECONDS: 20,
  GRID_ROWS: 3,
  GRID_COLS: 3,
  PICK_DISTANCE: 0.08,
  DROP_DISTANCE: 0.1,
  SCORE_PER_DROP: 10,
  SMOOTH_ALPHA: 0.7,
  STABLE_FRAMES: 2,
  DRAW_FPS: 30
};
// ==================== MAIN COMPONENT ====================
const GamePage2BallBasket = () => {
  // State Management
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationDone, setCalibrationDone] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibTimeLeft, setCalibTimeLeft] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [usingMouseFallback, setUsingMouseFallback] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', visible: false });
 
  // Game Stats
  const [score, setScore] = useState(0);
  const [reps, setReps] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [successRate, setSuccessRate] = useState(0);
 
  // Hand State
  const [leftHandVisible, setLeftHandVisible] = useState(false);
  const [rightHandVisible, setRightHandVisible] = useState(false);
  const [leftHandClosed, setLeftHandClosed] = useState(false);
  const [rightHandClosed, setRightHandClosed] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
 
  // Refs
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const gameCanvasRef = useRef(null);
  const handsModuleRef = useRef(null);
  const poseModuleRef = useRef(null);
  const cameraRef = useRef(null);
  const sessionStartRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const calibIntervalRef = useRef(null);
  const lastDrawTimeRef = useRef(0);
  const logsRef = useRef([]);
  const attemptsRef = useRef(0);
  const successesRef = useRef(0);
  const scoreRef = useRef(score);
  const isInitializedRef = useRef(isInitialized);
  const usingMouseFallbackRef = useRef(usingMouseFallback);
  const showDebugRef = useRef(showDebug);
 
  // Game State Refs
  const handStateRef = useRef({
    Left: {
      pos: null, smoothPos: null, closed: false, closedFrames: 0,
      openFrames: 0, landmarks: null, elbow: null, shoulder: null, visible: false
    },
    Right: {
      pos: null, smoothPos: null, closed: false, closedFrames: 0,
      openFrames: 0, landmarks: null, elbow: null, shoulder: null, visible: false
    }
  });
 
  const calibrationRef = useRef({
    active: false,
    done: false,
    minX: 1, maxX: 0,
    minY: 1, maxY: 0,
    centerX: 0.5, centerY: 0.5,
    maxReachNorm: 0.2
  });
 
  const gridHolesRef = useRef([]);
  const fruitRef = useRef(null);
  const basketIdxRef = useRef(null);
  const lastPoseResultsRef = useRef(null);
  // ==================== UTILITY FUNCTIONS ====================
  const distNorm = (a, b) => {
    if (!a || !b) return 999;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const smoothPos = (prev, next) => {
    if (!prev) return { x: next.x, y: next.y };
    return {
      x: prev.x * (1 - CONFIG.SMOOTH_ALPHA) + next.x * CONFIG.SMOOTH_ALPHA,
      y: prev.y * (1 - CONFIG.SMOOTH_ALPHA) + next.y * CONFIG.SMOOTH_ALPHA
    };
  };
  const nowSec = () => {
    return sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : 0;
  };
  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };
  const showStatus = (msg, duration = 2000) => {
    setStatusMessage({ text: msg, visible: true });
    setTimeout(() => setStatusMessage({ text: '', visible: false }), duration);
  };
  // ==================== SETUP GRID ====================
  const setupGrid = useCallback(() => {
    const holes = [];
    const marginX = 0.15, marginY = 0.15;
   
    for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
      for (let c = 0; c < CONFIG.GRID_COLS; c++) {
        const x = marginX + (c / (CONFIG.GRID_COLS - 1)) * (1 - 2 * marginX);
        const y = marginY + (r / (CONFIG.GRID_ROWS - 1)) * (1 - 2 * marginY);
        holes.push({ id: r * CONFIG.GRID_COLS + c, x, y });
      }
    }
    gridHolesRef.current = holes;
  }, []);
  // ==================== SPAWN FRUIT ====================
  const spawnFruit = useCallback(() => {
    let sourceIdx = Math.floor(Math.random() * gridHolesRef.current.length);
    let bIdx = Math.floor(Math.random() * gridHolesRef.current.length);
    while (bIdx === sourceIdx) {
      bIdx = Math.floor(Math.random() * gridHolesRef.current.length);
    }
   
    basketIdxRef.current = bIdx;
    fruitRef.current = {
      id: `F${Date.now()}`,
      sourceIdx,
      x: gridHolesRef.current[sourceIdx].x,
      y: gridHolesRef.current[sourceIdx].y,
      attachedTo: null
    };
   
    logsRef.current.push({
      timestamp: nowSec(),
      event: 'spawn',
      fruit_id: fruitRef.current.id,
      source: sourceIdx,
      basket: bIdx,
      score: scoreRef.current
    });
  }, []);
  // ==================== MEDIAPIPE HANDLERS ====================
  const onHandsResults = useCallback((results) => {
    const handState = handStateRef.current;
   
    handState.Left.visible = false;
    handState.Right.visible = false;
    handState.Left.landmarks = null;
    handState.Right.landmarks = null;
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const lm = results.multiHandLandmarks[i];
        const label = results.multiHandedness[i].label;
       
        const palmCenter = {
          x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
          y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5
        };
        const rawPos = { x: palmCenter.x, y: palmCenter.y };
        handState[label].pos = rawPos;
        handState[label].smoothPos = smoothPos(handState[label].smoothPos, rawPos);
        handState[label].landmarks = lm;
        handState[label].visible = true;
        // Grasp detection
        const fingerPairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
        let curledFingers = 0;
        fingerPairs.forEach(([tipIdx, midIdx]) => {
          if (lm[tipIdx].y > lm[midIdx].y + 0.03) curledFingers++;
        });
       
        const thumbTipPoint = lm[4];
        const wrist = lm[0];
        const middleBase = lm[9];
        const thumbToPalm = Math.hypot(thumbTipPoint.x - palmCenter.x, thumbTipPoint.y - palmCenter.y);
        const handSize = Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y) || 0.05;
        const normalizedThumbDist = thumbToPalm / handSize;
        const thumbClosed = normalizedThumbDist < 0.7;
       
        const fingerSpread = Math.hypot(lm[8].x - lm[20].x, lm[8].y - lm[20].y);
        const normalizedSpread = fingerSpread / handSize;
        const tightSpread = normalizedSpread < 0.8;
       
        const allTips = [4, 8, 12, 16, 20].map(idx => lm[idx]);
        let avgDistToPalm = 0;
        allTips.forEach(tip => {
          avgDistToPalm += Math.hypot(tip.x - palmCenter.x, tip.y - palmCenter.y);
        });
        avgDistToPalm /= allTips.length;
        const normalizedCompactness = avgDistToPalm / handSize;
        const veryCompact = normalizedCompactness < 0.9;
       
        const isClosed = (curledFingers === 4) ||
                         (curledFingers >= 3 && thumbClosed) ||
                         (curledFingers >= 2 && thumbClosed && tightSpread) ||
                         (veryCompact && tightSpread && thumbClosed);
       
        if (i === 0 && showDebugRef.current) {
          setDebugInfo(`${label} Hand
Curled: ${curledFingers}/4
Thumb: ${thumbClosed ? 'TUCKED' : 'OUT'} (${normalizedThumbDist.toFixed(2)})
Spread: ${tightSpread ? 'TIGHT' : 'WIDE'} (${normalizedSpread.toFixed(2)})
Compact: ${veryCompact ? 'YES' : 'NO'} (${normalizedCompactness.toFixed(2)})
State: ${isClosed ? '🔴 CLOSED' : '🟢 OPEN'}`);
        }
        if (isClosed) {
          handState[label].closedFrames = Math.min(handState[label].closedFrames + 1, CONFIG.STABLE_FRAMES + 2);
          handState[label].openFrames = 0;
        } else {
          handState[label].openFrames = Math.min(handState[label].openFrames + 1, CONFIG.STABLE_FRAMES + 2);
          handState[label].closedFrames = 0;
        }
        handState[label].closed = handState[label].closedFrames >= CONFIG.STABLE_FRAMES;
      }
    }
    setLeftHandVisible(handState.Left.visible);
    setRightHandVisible(handState.Right.visible);
    setLeftHandClosed(handState.Left.closed);
    setRightHandClosed(handState.Right.closed);
  }, []);
  const onPoseResults = useCallback((results) => {
    lastPoseResultsRef.current = results;
    const handState = handStateRef.current;
   
    if (results.poseLandmarks) {
      const pl = results.poseLandmarks;
     
      const update = (label, shoulderIdx, elbowIdx) => {
        if (pl[shoulderIdx] && pl[shoulderIdx].visibility > 0.5) {
          const shoulder = { x: pl[shoulderIdx].x, y: pl[shoulderIdx].y };
          handState[label].shoulder = smoothPos(handState[label].shoulder, shoulder);
        }
        if (pl[elbowIdx] && pl[elbowIdx].visibility > 0.5) {
          const elbow = { x: pl[elbowIdx].x, y: pl[elbowIdx].y };
          handState[label].elbow = smoothPos(handState[label].elbow, elbow);
        }
      };
      update('Left', 11, 13);
      update('Right', 12, 14);
      if (calibrationRef.current.active) {
        ['Left', 'Right'].forEach(label => {
          if (handState[label].smoothPos) {
            calibrationRef.current.minX = Math.min(calibrationRef.current.minX, handState[label].smoothPos.x);
            calibrationRef.current.maxX = Math.max(calibrationRef.current.maxX, handState[label].smoothPos.x);
            calibrationRef.current.minY = Math.min(calibrationRef.current.minY, handState[label].smoothPos.y);
            calibrationRef.current.maxY = Math.max(calibrationRef.current.maxY, handState[label].smoothPos.y);
          }
        });
      }
    }
  }, []);
  // ==================== SETUP MEDIAPIPE ====================
  const setupMediaPipe = useCallback(async () => {
    if (handsModuleRef.current || poseModuleRef.current) {
      console.log('MediaPipe already initialized, skipping.');
      return;
    }
    if (!Hands || !Pose || !Camera) {
      console.error('MediaPipe libraries not loaded');
      return;
    }
    try {
      handsModuleRef.current = new Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
      });
      handsModuleRef.current.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      handsModuleRef.current.onResults(onHandsResults);
      poseModuleRef.current = new Pose({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
      });
      poseModuleRef.current.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: true
      });
      poseModuleRef.current.onResults(onPoseResults);
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!usingMouseFallbackRef.current && isInitializedRef.current) {
            await handsModuleRef.current.send({ image: videoRef.current });
            await poseModuleRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });
      await cameraRef.current.start();
      setIsInitialized(true);
      isInitializedRef.current = true;
      console.log('✓ Camera started successfully');
    } catch (e) {
      console.warn('Camera failed:', e);
      alert('Camera unavailable. Enable mouse fallback to test without webcam.');
    }
  }, [onHandsResults, onPoseResults]);
  // ==================== GAME LOGIC ====================
  const gameLogicTick = useCallback(() => {
    if (!fruitRef.current || !sessionStartRef.current) return;
    const handState = handStateRef.current;
    ['Left', 'Right'].forEach(label => {
      const hand = handState[label];
      if (!hand.smoothPos || !hand.visible) return;
      if (!fruitRef.current.attachedTo && hand.closedFrames >= CONFIG.STABLE_FRAMES) {
        const source = gridHolesRef.current[fruitRef.current.sourceIdx];
        const dist = distNorm(hand.smoothPos, source);
       
        if (dist < CONFIG.PICK_DISTANCE) {
          fruitRef.current.attachedTo = label;
          logsRef.current.push({
            timestamp: nowSec(),
            event: 'pick',
            fruit_id: fruitRef.current.id,
            hand: label,
            source: fruitRef.current.sourceIdx,
            basket: basketIdxRef.current
          });
          showStatus(`✊ ${label} hand grasped fruit!`, 1000);
        }
      }
      if (fruitRef.current.attachedTo === label && hand.openFrames >= CONFIG.STABLE_FRAMES) {
        const basket = gridHolesRef.current[basketIdxRef.current];
        const dist = distNorm(hand.smoothPos, basket);
       
        if (dist < CONFIG.DROP_DISTANCE) {
          const newScore = scoreRef.current + CONFIG.SCORE_PER_DROP;
          setScore(newScore);
          scoreRef.current = newScore;
          setReps(prev => prev + 1);
          successesRef.current++;
          attemptsRef.current++;
         
          logsRef.current.push({
            timestamp: nowSec(),
            event: 'drop_success',
            fruit_id: fruitRef.current.id,
            hand: label,
            source: fruitRef.current.sourceIdx,
            basket: basketIdxRef.current,
            score: newScore
          });
         
          const newRate = ((successesRef.current / attemptsRef.current) * 100).toFixed(0);
          setSuccessRate(newRate);
         
          showStatus(`✅ Success! +${CONFIG.SCORE_PER_DROP} points`, 1500);
          spawnFruit();
        } else {
          attemptsRef.current++;
          fruitRef.current.attachedTo = null;
          fruitRef.current.x = gridHolesRef.current[fruitRef.current.sourceIdx].x;
          fruitRef.current.y = gridHolesRef.current[fruitRef.current.sourceIdx].y;
         
          logsRef.current.push({
            timestamp: nowSec(),
            event: 'drop_miss',
            fruit_id: fruitRef.current.id,
            hand: label,
            source: fruitRef.current.sourceIdx,
            basket: basketIdxRef.current
          });
         
          const newRate = ((successesRef.current / attemptsRef.current) * 100).toFixed(0);
          setSuccessRate(newRate);
         
          showStatus('⚠️ Missed! Release over basket', 1500);
        }
      }
      if (fruitRef.current.attachedTo === label) {
        fruitRef.current.x = hand.smoothPos.x;
        fruitRef.current.y = hand.smoothPos.y;
      }
    });
  }, [spawnFruit]);
  // ==================== DRAWING ====================
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
   
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    if (lastPoseResultsRef.current?.poseLandmarks) {
      const pl = lastPoseResultsRef.current.poseLandmarks;
      [[11, 'L-Sh'], [12, 'R-Sh'], [13, 'L-El'], [14, 'R-El']].forEach(([idx]) => {
        if (!pl[idx] || pl[idx].visibility < 0.5) return;
        const x = pl[idx].x * w;
        const y = pl[idx].y * h;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.fill();
      });
    }
    const handState = handStateRef.current;
    ['Left', 'Right'].forEach(label => {
      const hand = handState[label];
      if (!hand.landmarks || !hand.visible) return;
      const lm = hand.landmarks;
      const color = hand.closed ? 'rgba(220, 50, 50, 0.9)' : 'rgba(50, 200, 80, 0.9)';
     
      const palmCenter = {
        x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
        y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5
      };
     
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
      ];
     
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const p1 = lm[start];
        const p2 = lm[end];
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      });
     
      lm.forEach((landmark, i) => {
        const x = landmark.x * w;
        const y = landmark.y * h;
        ctx.beginPath();
       
        let radius = 4;
        if (i === 8) radius = 10;
        else if ([4, 12, 16, 20].includes(i)) radius = 7;
        else if (i === 0) radius = 6;
       
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
       
        if ([0, 4, 8, 12, 16, 20].includes(i)) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
     
      const pcx = palmCenter.x * w;
      const pcy = palmCenter.y * h;
      ctx.beginPath();
      ctx.arc(pcx, pcy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = hand.closed ? '#ff6b6b' : '#51cf66';
      ctx.lineWidth = 3;
      ctx.stroke();
     
      ctx.beginPath();
      ctx.moveTo(pcx - 12, pcy);
      ctx.lineTo(pcx + 12, pcy);
      ctx.moveTo(pcx, pcy - 12);
      ctx.lineTo(pcx, pcy + 12);
      ctx.stroke();
     
      ctx.beginPath();
      ctx.arc(pcx, pcy, 4, 0, Math.PI * 2);
      ctx.fillStyle = hand.closed ? '#ff6b6b' : '#51cf66';
      ctx.fill();
      const stateText = hand.closed ? 'CLOSED' : 'OPEN';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(pcx + 20, pcy - 16, 120, 26);
     
      ctx.fillStyle = hand.closed ? '#ff6b6b' : '#51cf66';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${label} ${stateText}`, pcx + 26, pcy);
    });
  }, []);
  const drawGame = useCallback(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
   
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const scale = window.devicePixelRatio || 1;
    gridHolesRef.current.forEach((hole, idx) => {
      const px = hole.x * w;
      const py = hole.y * h;
      const r = Math.max(35 * scale, CONFIG.PICK_DISTANCE * Math.min(w, h));
      ctx.beginPath();
      ctx.fillStyle = idx === basketIdxRef.current ? 'rgba(180, 255, 180, 0.9)' : 'rgba(255, 255, 255, 0.7)';
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = idx === basketIdxRef.current ? '#2f7a2f' : '#999';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = `${13 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(idx === basketIdxRef.current ? '🧺' : `${idx}`, px, py + 5 * scale);
    });
    if (fruitRef.current) {
      const handState = handStateRef.current;
      let fx, fy;
      if (fruitRef.current.attachedTo && handState[fruitRef.current.attachedTo].smoothPos) {
        fx = handState[fruitRef.current.attachedTo].smoothPos.x * w;
        fy = handState[fruitRef.current.attachedTo].smoothPos.y * h;
      } else {
        fx = fruitRef.current.x * w;
        fy = fruitRef.current.y * h;
      }
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.arc(fx + 2, fy + 2, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#ff6347';
      ctx.arc(fx, fy, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
     
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(fx - 2, fy - 28 * scale, 4, 12 * scale);
    }
    const handState = handStateRef.current;
    ['Left', 'Right'].forEach(label => {
      const hand = handState[label];
      if (!hand.smoothPos || !hand.visible) return;
      const px = hand.smoothPos.x * w;
      const py = hand.smoothPos.y * h;
     
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.arc(px + 2, py + 2, 14 * scale, 0, Math.PI * 2);
      ctx.fill();
     
      ctx.beginPath();
      ctx.fillStyle = hand.closed ? 'rgba(220, 50, 50, 0.95)' : 'rgba(50, 200, 80, 0.95)';
      ctx.arc(px, py, 14 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
     
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label[0], px, py);
    });
  }, []);
  const syncCanvasSizes = useCallback(() => {
    if (overlayRef.current && videoRef.current) {
      if (overlayRef.current.width !== videoRef.current.videoWidth) {
        overlayRef.current.width = videoRef.current.videoWidth || 640;
        overlayRef.current.height = videoRef.current.videoHeight || 480;
      }
    }
   
    if (gameCanvasRef.current) {
      const targetW = gameCanvasRef.current.clientWidth * (window.devicePixelRatio || 1);
      const targetH = gameCanvasRef.current.clientHeight * (window.devicePixelRatio || 1);
     
      if (gameCanvasRef.current.width !== targetW || gameCanvasRef.current.height !== targetH) {
        gameCanvasRef.current.width = targetW;
        gameCanvasRef.current.height = targetH;
      }
    }
  }, []);
  // ==================== MAIN LOOP ====================
  const mainLoop = useCallback(() => {
    const now = Date.now();
    const drawInterval = 1000 / CONFIG.DRAW_FPS;
   
    if (now - lastDrawTimeRef.current >= drawInterval) {
      syncCanvasSizes();
      drawOverlay();
      drawGame();
      lastDrawTimeRef.current = now;
    }
   
    gameLogicTick();
    requestAnimationFrame(mainLoop);
  }, [syncCanvasSizes, drawOverlay, drawGame, gameLogicTick]);
  // ==================== EVENT HANDLERS ====================
  const handleStartCalibration = () => {
    calibrationRef.current.active = true;
    calibrationRef.current.minX = 1;
    calibrationRef.current.maxX = 0;
    calibrationRef.current.minY = 1;
    calibrationRef.current.maxY = 0;
   
    setIsCalibrating(true);
    setCalibTimeLeft(CONFIG.CALIBRATION_SECONDS);
   
    calibIntervalRef.current = setInterval(() => {
      setCalibTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(calibIntervalRef.current);
          finishCalibration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const finishCalibration = () => {
    calibrationRef.current.active = false;
    setIsCalibrating(false);
   
    calibrationRef.current.centerX = (calibrationRef.current.minX + calibrationRef.current.maxX) / 2;
    calibrationRef.current.centerY = (calibrationRef.current.minY + calibrationRef.current.maxY) / 2;
    const dx = Math.max(
      Math.abs(calibrationRef.current.centerX - calibrationRef.current.minX),
      Math.abs(calibrationRef.current.centerX - calibrationRef.current.maxX)
    );
    const dy = Math.max(
      Math.abs(calibrationRef.current.centerY - calibrationRef.current.minY),
      Math.abs(calibrationRef.current.centerY - calibrationRef.current.maxY)
    );
    calibrationRef.current.maxReachNorm = Math.sqrt(dx * dx + dy * dy) || 0.2;
    calibrationRef.current.done = true;
   
    setCalibrationDone(true);
    logsRef.current.push({ timestamp: 0, event: 'calibration_complete', calibration: calibrationRef.current });
    showStatus('✓ Calibration complete! Ready to start.');
  };
  const handleStartSession = () => {
    if (!calibrationDone) {
      if (!window.confirm('Calibration recommended. Continue anyway?')) return;
    }
   
    setScore(0);
    scoreRef.current = 0;
    setReps(0);
    attemptsRef.current = 0;
    successesRef.current = 0;
    logsRef.current = [];
    sessionStartRef.current = Date.now();
   
    setupGrid();
    spawnFruit();
    setTimeRemaining(CONFIG.SESSION_SECONDS);
    setSuccessRate(0);
    setIsSessionActive(true);
   
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const remaining = Math.max(0, CONFIG.SESSION_SECONDS - elapsed);
      setTimeRemaining(remaining);
     
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        handleEndSession();
      }
    }, 1000);
   
    logsRef.current.push({ timestamp: 0, event: 'session_start' });
    showStatus('🎮 Session started! Close hand to grab fruit!', 3000);
  };
  const handleEndSession = () => {
    setIsSessionActive(false);
    logsRef.current.push({ timestamp: nowSec(), event: 'session_end', score: scoreRef.current, reps });
    const successRateVal = attemptsRef.current > 0
      ? ((successesRef.current / attemptsRef.current) * 100).toFixed(1)
      : 0;
    alert(`Session Complete!\n\nScore: ${scoreRef.current}\nReps: ${reps}\nSuccess Rate: ${successRateVal}%\n\nDownload CSV to save your data.`);
  };
  const handleDownloadCSV = () => {
    const headers = ['timestamp_sec', 'event', 'fruit_id', 'hand', 'source', 'basket', 'score'];
    const rows = [headers.join(',')];
   
    logsRef.current.forEach(log => {
      const row = [
        log.timestamp ?? '',
        log.event ?? '',
        log.fruit_id ?? '',
        log.hand ?? '',
        log.source ?? '',
        log.basket ?? '',
        log.score ?? ''
      ];
      rows.push(row.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arm-orchard-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleReset = () => {
    window.location.reload();
  };
  const handleMouseFallbackChange = (e) => {
    const checked = e.target.checked;
    setUsingMouseFallback(checked);
    usingMouseFallbackRef.current = checked;
    if (checked) {
      alert('Mouse fallback enabled. Click/drag on video to control right hand.');
      handStateRef.current.Right.visible = true;
      setRightHandVisible(true);
    } else {
      handStateRef.current.Right.visible = false;
      setRightHandVisible(false);
    }
  };
  const handleOverlayMouseMove = (e) => {
    if (!usingMouseFallbackRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const pos = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
    handStateRef.current.Right.smoothPos = smoothPos(handStateRef.current.Right.smoothPos, pos);
    handStateRef.current.Right.visible = true;
    setRightHandVisible(true);
  };
  const handleOverlayMouseDown = () => {
    if (!usingMouseFallbackRef.current) return;
    handStateRef.current.Right.closedFrames = CONFIG.STABLE_FRAMES;
    handStateRef.current.Right.openFrames = 0;
    handStateRef.current.Right.closed = true;
    setRightHandClosed(true);
  };
  const handleOverlayMouseUp = () => {
    if (!usingMouseFallbackRef.current) return;
    handStateRef.current.Right.openFrames = CONFIG.STABLE_FRAMES;
    handStateRef.current.Right.closedFrames = 0;
    handStateRef.current.Right.closed = false;
    setRightHandClosed(false);
  };
  // ==================== EFFECTS ====================
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);
  useEffect(() => {
    usingMouseFallbackRef.current = usingMouseFallback;
  }, [usingMouseFallback]);
  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);
  useEffect(() => {
    setupGrid();
    setupMediaPipe();
   
    const loopId = requestAnimationFrame(mainLoop);
    const handleKeyDown = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
   
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(loopId);
      document.removeEventListener('keydown', handleKeyDown);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (calibIntervalRef.current) clearInterval(calibIntervalRef.current);
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, [setupGrid, setupMediaPipe, mainLoop]);
  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      <aside style={styles.panel}>
        <h1 style={styles.title}>🍎 Arm  – Fruit Fetch</h1>
        <p style={styles.muted}>
          Upper limb rehabilitation game: Reach → Grasp (close hand) → Transport → Release (open hand) into basket. 5-minute therapeutic session.
        </p>
        <div style={styles.videoWrap}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <canvas
            ref={overlayRef}
            style={styles.overlay}
            onMouseMove={handleOverlayMouseMove}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
          />
         
          {isCalibrating && (
            <div style={styles.calibOverlay}>
              <div style={styles.calibText}>
                Calibrating... {calibTimeLeft}s - Move to corners & center!
              </div>
            </div>
          )}
         
          <div style={styles.handStatus}>
            {leftHandVisible && (
              <div style={{...styles.handIndicator, ...(leftHandClosed ? styles.handClosed : styles.handOpen)}}>
                <span style={styles.dot}></span>
                <span>Left - {leftHandClosed ? 'CLOSED 🔴' : 'OPEN 🟢'}</span>
              </div>
            )}
            {rightHandVisible && (
              <div style={{...styles.handIndicator, ...(rightHandClosed ? styles.handClosed : styles.handOpen)}}>
                <span style={styles.dot}></span>
                <span>Right - {rightHandClosed ? 'CLOSED 🔴' : 'OPEN 🟢'}</span>
              </div>
            )}
          </div>
         
          {showDebug && debugInfo && (
            <div style={styles.debugPanel}>
              <pre style={{margin: 0, fontSize: '11px'}}>{debugInfo}</pre>
            </div>
          )}
        </div>
        <div style={styles.controls}>
          <button
            onClick={handleStartCalibration}
            style={styles.controlButton}
            disabled={isCalibrating}
          >
            📏 Start 20s Calibration
          </button>
          <button
            onClick={handleStartSession}
            style={{...styles.controlButton, ...(calibrationDone ? {} : styles.buttonDisabled)}}
            disabled={!calibrationDone || isSessionActive}
          >
            ▶️ Start 5min Session
          </button>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={usingMouseFallback}
              onChange={handleMouseFallbackChange}
              style={styles.checkbox}
            />
            <span>Use mouse fallback (if webcam fails)</span>
          </label>
        </div>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Score</div>
            <div style={styles.statValue}>{score}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Reps</div>
            <div style={styles.statValue}>{reps}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Timer</div>
            <div style={styles.statValue}>{formatTime(timeRemaining)}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Success</div>
            <div style={styles.statValue}>{successRate}%</div>
          </div>
        </div>
        <div style={styles.actions}>
          <button onClick={handleDownloadCSV} style={styles.actionButton}>
            💾 Download CSV
          </button>
          <button onClick={handleReset} style={styles.actionButton}>
            🔄 Reset
          </button>
        </div>
        <div style={styles.note}>
          <strong style={styles.noteTitle}>How to play:</strong>
          • Make a <strong style={{color: '#dc3545'}}>FIST (closed)</strong> to grasp the fruit 🔴<br/>
          • <strong style={{color: '#28a745'}}>OPEN PALM (spread fingers)</strong> to release into basket 🟢<br/>
          • The <strong>crosshair circle</strong> on your palm is your cursor<br/>
          • Watch the colored skeleton - Red = Closed, Green = Open<br/>
          • Press <strong>'D'</strong> to show debug metrics
        </div>
      </aside>
      <main style={styles.gameArea}>
        <canvas ref={gameCanvasRef} style={styles.gameCanvas} />
        {statusMessage.visible && (
          <div style={styles.statusMessage}>
            {statusMessage.text}
          </div>
        )}
      </main>
    </div>
  );
};
// ==================== STYLES ====================
const styles = {
  container: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    height: '100vh',
    background: 'linear-gradient(#eaf7ea, #f6faf3)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    overflow: 'hidden'
  },
  panel: {
    width: '360px',
    background: '#fff',
    padding: '14px',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(20, 40, 20, 0.06)',
    overflowY: 'auto'
  },
  title: {
    color: '#2f7a2f',
    margin: '0 0 8px',
    fontSize: '22px'
  },
  muted: {
    color: '#575f56',
    fontSize: '13px',
    margin: '0 0 12px',
    lineHeight: 1.4
  },
  videoWrap: {
    position: 'relative',
    height: '260px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#111',
    border: '2px solid #ddd'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)'
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'auto'
  },
  calibOverlay: {
    position: 'absolute',
    left: '8px',
    top: '8px',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '6px',
    zIndex: 10,
    fontSize: '13px',
    fontWeight: 500,
    maxWidth: '280px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  },
  calibText: {
    margin: 0
  },
  handStatus: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    display: 'flex',
    gap: '8px',
    zIndex: 5
  },
  handIndicator: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
  },
  handClosed: {
    background: '#dc3545'
  },
  handOpen: {
    background: '#28a745'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'white'
  },
  debugPanel: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '8px',
    background: 'rgba(0, 0, 0, 0.85)',
    color: '#0f0',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    maxWidth: '200px',
    zIndex: 10
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px'
  },
  controlButton: {
    padding: '11px',
    borderRadius: '8px',
    border: 0,
    background: '#2f7a2f',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#575f56',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  checkbox: {
    cursor: 'pointer'
  },
  stats: {
    marginTop: '12px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  statItem: {
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '6px',
    border: '1px solid #eee'
  },
  statLabel: {
    fontSize: '11px',
    color: '#575f56',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#2f7a2f'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px'
  },
  actionButton: {
    flex: 1,
    padding: '9px',
    borderRadius: '8px',
    border: 0,
    background: '#e8e8e8',
    color: '#333',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background 0.2s'
  },
  note: {
    fontSize: '12px',
    color: '#575f56',
    marginTop: '12px',
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: '6px',
    lineHeight: 1.6,
    borderLeft: '3px solid #2f7a2f'
  },
  noteTitle: {
    color: '#2f7a2f',
    display: 'block',
    marginBottom: '6px'
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    position: 'relative'
  },
  gameCanvas: {
    flex: 1,
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #cfead1, #86c98a)',
    display: 'block',
    width: '100%',
    height: '100%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  },
  statusMessage: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#2f7a2f',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
    pointerEvents: 'none',
    animation: 'slideDown 0.3s ease'
  }
};
export default GamePage2BallBasket;