import { Hands } from "@mediapipe/hands";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import gameSessionBuffer from "../../../services/gameSessionBuffer";
import SaveExitButton from "../SaveExitButton";
import {
  COORD_SAMPLE_INTERVAL_MS,
  BOARD_DRAWING_COORD_SAMPLE_MS,
  MAX_COORDS_PER_SESSION,
  DEFAULT_SESSION_SECONDS,
  BOARD_DRAWING_CALIBRATION_SECONDS,
  BOARD_DRAWING_NUM_SHAPE_POINTS,
  BOARD_DRAWING_PICK_DISTANCE,
  BOARD_DRAWING_TRACE_TOLERANCE,
  BOARD_DRAWING_SCORE_PER_SHAPE,
  BOARD_DRAWING_MIN_COMPLETION,
  BOARD_DRAWING_SMOOTH_ALPHA,
  BOARD_DRAWING_STABLE_FRAMES,
  BOARD_DRAWING_DRAW_FPS,
  BOARD_DRAWING_DEFAULT_SAFE_ZONE_RADIUS,
  BOARD_DRAWING_DEFAULT_WARNING_ZONE_RADIUS,
  TESTING_SHAPE_SEQUENCE,
} from "../../../constants";
import { useSettings } from "../../../context/SettingsContext";
import * as GameStorage from "./gameStorage";
// ==================== CONFIGURATION ====================
const CONFIG = {
  SESSION_SECONDS: DEFAULT_SESSION_SECONDS,
  CALIBRATION_SECONDS: BOARD_DRAWING_CALIBRATION_SECONDS,
  NUM_SHAPE_POINTS: BOARD_DRAWING_NUM_SHAPE_POINTS,
  PICK_DISTANCE: BOARD_DRAWING_PICK_DISTANCE,
  TRACE_TOLERANCE: BOARD_DRAWING_TRACE_TOLERANCE,
  SCORE_PER_SHAPE: BOARD_DRAWING_SCORE_PER_SHAPE,
  MIN_COMPLETION: BOARD_DRAWING_MIN_COMPLETION,
  SMOOTH_ALPHA: BOARD_DRAWING_SMOOTH_ALPHA,
  STABLE_FRAMES: BOARD_DRAWING_STABLE_FRAMES,
  DRAW_FPS: BOARD_DRAWING_DRAW_FPS,
};

// ==================== SHAPE GENERATION ====================
const SHAPES = [
  "circle",
  "ellipse",
  "triangle",
  "square",
  "hexagon",
  "star",
  "heart",
  "diamond",
  "spiral",
  "infinity",
  "zigzag"
];

const SHAPE_COMPLEXITY_MULTIPLIERS = {
  circle: 1.0,
  ellipse: 1.2,
  triangle: 1.2,
  square: 1.2,
  diamond: 1.3,
  hexagon: 1.5,
  heart: 2.0,
  star: 2.5,
  spiral: 3.0,
  infinity: 2.5,
  zigzag: 2.0,
};


const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getPolygonPoint = (numSides, t) => {
  const side = Math.floor(t * numSides);
  const sideT = (t * numSides) - side;
  const startTheta = (side / numSides) * 2 * Math.PI - Math.PI / 2;
  const endTheta = ((side + 1) / numSides) * 2 * Math.PI - Math.PI / 2;
  const startX = Math.cos(startTheta);
  const startY = Math.sin(startTheta);
  const endX = Math.cos(endTheta);
  const endY = Math.sin(endTheta);
  const px = startX + sideT * (endX - startX);
  const py = startY + sideT * (endY - startY);
  return { px, py };
};

const generateShapePoints = (type, numPoints = CONFIG.NUM_SHAPE_POINTS) => {
  const centerX = 0.5;
  const centerY = 0.5;
  let radius = 0.35;
  const points = [];
  const angleStep = (2 * Math.PI) / numPoints;
  for (let i = 0; i < numPoints; i++) {
    let theta = i * angleStep;
    let x, y;
    switch (type) {
      case "circle":
        x = centerX + radius * Math.cos(theta);
        y = centerY + radius * Math.sin(theta);
        break;
      case "ellipse":
        x = centerX + radius * 1.5 * Math.cos(theta);
        y = centerY + radius * 0.8 * Math.sin(theta);
        break;
      case "triangle": {
        const pTri = getPolygonPoint(3, i / numPoints);
        x = centerX + radius * pTri.px;
        y = centerY + radius * pTri.py;
        break;
      }
      case "square":
        const t = i / numPoints;
        const sideFrac = 0.25;
        let frac = t;
        let px, py;
        if (frac < sideFrac) {
          px = -0.5 + frac / sideFrac;
          py = -0.5;
        } else if (frac < 2 * sideFrac) {
          px = 0.5;
          py = -0.5 + (frac - sideFrac) / sideFrac;
        } else if (frac < 3 * sideFrac) {
          px = 0.5 - (frac - 2 * sideFrac) / sideFrac;
          py = 0.5;
        } else {
          px = -0.5;
          py = 0.5 - (frac - 3 * sideFrac) / sideFrac;
        }
        x = centerX + radius * px;
        y = centerY + radius * py;
        break;
      case "hexagon": {
        const pHex = getPolygonPoint(6, i / numPoints);
        x = centerX + radius * pHex.px;
        y = centerY + radius * pHex.py;
        break;
      }
      case "star":
        const rInner = radius * 0.4;
        const rOuter = radius;
        const r = i % 2 === 0 ? rOuter : rInner;
        x = centerX + r * Math.cos(theta - Math.PI / 2);
        y = centerY + r * Math.sin(theta - Math.PI / 2);
        break;
      case "heart":
        const t_h = (i / numPoints) * 2 * Math.PI;
        // parametric heart: x = 16 sin^3(t), y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
        const hx = 16 * Math.pow(Math.sin(t_h), 3);
        const hy = -(
          13 * Math.cos(t_h) -
          5 * Math.cos(2 * t_h) -
          2 * Math.cos(3 * t_h) -
          Math.cos(4 * t_h)
        );
        x = centerX + (hx / 16) * radius;
        y = centerY + (hy / 16) * radius + 0.05; // Slightly offset up
        break;
      case "diamond":
        const td = i / numPoints;
        if (td < 0.25) {
          // Top to Right
          x = centerX + (td / 0.25) * radius;
          y = centerY - (1 - td / 0.25) * radius;
        } else if (td < 0.5) {
          // Right to Bottom
          x = centerX + (1 - (td - 0.25) / 0.25) * radius;
          y = centerY + ((td - 0.25) / 0.25) * radius;
        } else if (td < 0.75) {
          // Bottom to Left
          x = centerX - ((td - 0.5) / 0.25) * radius;
          y = centerY + (1 - (td - 0.5) / 0.25) * radius;
        } else {
          // Left to Top
          x = centerX - (1 - (td - 0.75) / 0.25) * radius;
          y = centerY - ((td - 0.75) / 0.25) * radius;
        }
        break;
      case "spiral":
        // Archimedean spiral: r = a + b * theta
        // We want it to wrap a few times. Let's do 2.5 wraps.
        const totalTheta = 2.5 * 2 * Math.PI;
        const currentTheta = (i / numPoints) * totalTheta;
        // Start near center, end at radius
        const spiralRadius = (currentTheta / totalTheta) * radius;
        x = centerX + spiralRadius * Math.cos(currentTheta);
        y = centerY + spiralRadius * Math.sin(currentTheta);
        break;
      case "infinity":
        // Lemniscate of Bernoulli
        // x = (a * sqrt(2) * cos(t)) / (sin^2(t) + 1)
        // y = (a * sqrt(2) * cos(t) * sin(t)) / (sin^2(t) + 1)
        const t_inf = (i / numPoints) * 2 * Math.PI;
        const den = Math.pow(Math.sin(t_inf), 2) + 1;
        x = centerX + (radius * 1.5 * Math.cos(t_inf)) / den;
        y = centerY + (radius * 1.5 * Math.cos(t_inf) * Math.sin(t_inf)) / den;
        break;
      case "zigzag":
        // A simple W or zigzag shape across the screen
        const numZigs = 4;
        const progress = i / numPoints;
        x = centerX - radius + (progress * radius * 2);
        // y goes up and down
        // 0 -> up, 1/4 -> down, 2/4 -> up, etc.
        const zigPhase = (progress * numZigs) % 2; 
        y = centerY + (zigPhase < 1 ? zigPhase - 0.5 : 1.5 - zigPhase) * radius;
        break;
      default:
        x = centerX + radius * Math.cos(theta);
        y = centerY + radius * Math.sin(theta);
    }
    // Final Clamp to ensure boundaries
    points.push({
      x: clamp(x, 0.05, 0.95),
      y: clamp(y, 0.05, 0.95),
    });
  }
  return points;
};

const distNorm = (a, b) => {
  if (!a || !b) return 999;
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const getMinDistanceToShapeOutline = (pos, points) => {
  if (!points || points.length < 2) return 999;
  let minDistance = 999;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const l2 = distNorm(p1, p2) ** 2;
    if (l2 === 0) {
      minDistance = Math.min(minDistance, distNorm(pos, p1));
      continue;
    }
    let t = ((pos.x - p1.x) * (p2.x - p1.x) + (pos.y - p1.y) * (p2.y - p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
    minDistance = Math.min(minDistance, distNorm(pos, projection));
  }
  return minDistance;
};

// ==================== MAIN COMPONENT ====================
const BoardDrawingGame = () => {
  const { user, isDarkMode } = useAuth();
  const { globalSettings } = useSettings();
  const navigate = useNavigate();
  // State Management
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationDone, setCalibrationDone] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibTimeLeft, setCalibTimeLeft] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [usingMouseFallback] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    text: "",
    visible: false,
  });

  // Game Stats
  const [score, setScore] = useState(0);
  const [reps, setReps] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [successRate, setSuccessRate] = useState(0);

  const [selectedShape, setSelectedShape] = useState(() => {
    return localStorage.getItem("board_drawing_selected_shape") || "random";
  });
  const selectedShapeRef = useRef("random");

  useEffect(() => {
    selectedShapeRef.current = selectedShape;
    localStorage.setItem("board_drawing_selected_shape", selectedShape);
  }, [selectedShape]);

  const [handPoseMode, setHandPoseModeState] = useState(() => {
    const saved = localStorage.getItem("board_drawing_hand_pose_mode");
    if (saved) return saved;
    return globalSettings?.boardDrawingAssistiveMode !== false ? "any" : "strict";
  });
  const handPoseModeRef = useRef(globalSettings?.boardDrawingAssistiveMode !== false ? "any" : "strict");
  
  useEffect(() => {
    if (globalSettings?.boardDrawingAssistiveMode !== undefined && !localStorage.getItem("board_drawing_hand_pose_mode")) {
      const mode = globalSettings.boardDrawingAssistiveMode ? "any" : "strict";
      setHandPoseModeState(mode);
      handPoseModeRef.current = mode;
    }
  }, [globalSettings?.boardDrawingAssistiveMode]);

  useEffect(() => {
    handPoseModeRef.current = handPoseMode;
    localStorage.setItem("board_drawing_hand_pose_mode", handPoseMode);
  }, [handPoseMode]);

  const toggleHandPoseMode = () => {
    const newMode = handPoseMode === "strict" ? "any" : "strict";
    setHandPoseModeState(newMode);
  };

  const [safeZoneRadius, setSafeZoneRadius] = useState(() => {
    const saved = localStorage.getItem("board_drawing_safe_zone_radius");
    return saved ? parseFloat(saved) : BOARD_DRAWING_DEFAULT_SAFE_ZONE_RADIUS;
  });
  const safeZoneRadiusRef = useRef(BOARD_DRAWING_DEFAULT_SAFE_ZONE_RADIUS);
  const [warningZoneRadius, setWarningZoneRadius] = useState(() => {
    const saved = localStorage.getItem("board_drawing_warning_zone_radius");
    return saved ? parseFloat(saved) : BOARD_DRAWING_DEFAULT_WARNING_ZONE_RADIUS;
  });
  const warningZoneRadiusRef = useRef(BOARD_DRAWING_DEFAULT_WARNING_ZONE_RADIUS);

  useEffect(() => {
    safeZoneRadiusRef.current = safeZoneRadius;
    localStorage.setItem("board_drawing_safe_zone_radius", safeZoneRadius.toString());
  }, [safeZoneRadius]);

  useEffect(() => {
    warningZoneRadiusRef.current = warningZoneRadius;
    localStorage.setItem("board_drawing_warning_zone_radius", warningZoneRadius.toString());
  }, [warningZoneRadius]);

  const isSessionActiveRef = useRef(false);
  const shapeTimerRef = useRef(null);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
    if (!isSessionActive) {
      if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
    }
  }, [isSessionActive]);

  // Hand State
  const [leftHandVisible, setLeftHandVisible] = useState(false);
  const [rightHandVisible, setRightHandVisible] = useState(false);
  const [leftHandClosed, setLeftHandClosed] = useState(false);
  const [rightHandClosed, setRightHandClosed] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [debugInfo, setDebugInfo] = useState("");
  const [showAnalyticsBtn, setShowAnalyticsBtn] = useState(false);

  // Local storage game id ref
  const localGameIdRef = useRef(null);

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
  const coordinateLogRef = useRef([]);
  const lastCoordTimeRef = useRef(0);
  const boardDrawingAttemptsRef = useRef([]);
  const activeAttemptStartedAtRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const mouseStateRef = useRef({ isDown: false, x: 0, y: 0 });

  // Game State Refs
  const handStateRef = useRef({
    Left: {
      pos: null,
      smoothPos: null,
      closed: false,
      closedFrames: 0,
      openFrames: 0,
      landmarks: null,
      elbow: null,
      shoulder: null,
      visible: false,
    },
    Right: {
      pos: null,
      smoothPos: null,
      closed: false,
      closedFrames: 0,
      openFrames: 0,
      landmarks: null,
      elbow: null,
      shoulder: null,
      visible: false,
    },
  });

  const calibrationRef = useRef({
    active: false,
    done: false,
    minX: 1,
    maxX: 0,
    minY: 1,
    maxY: 0,
    centerX: 0.5,
    centerY: 0.5,
    maxReachNorm: 0.2,
    level: 1,
  });

  const shapeRef = useRef(null);
  const currentTargetIdxRef = useRef(0);
  const drawnPathRef = useRef([]);
  const gestureResetRequiredRef = useRef(false);
  const lastPoseResultsRef = useRef(null);

  // ==================== UTILITY FUNCTIONS ====================
  const smoothPos = (prev, next) => {
    if (!prev) return { x: next.x, y: next.y };
    return {
      x: prev.x * (1 - CONFIG.SMOOTH_ALPHA) + next.x * CONFIG.SMOOTH_ALPHA,
      y: prev.y * (1 - CONFIG.SMOOTH_ALPHA) + next.y * CONFIG.SMOOTH_ALPHA,
    };
  };
  const nowSec = useCallback(() => {
    return sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;
  }, []);
  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };
  const showStatus = (msg, duration = 2000) => {
    setStatusMessage({ text: msg, visible: true });
    setTimeout(() => setStatusMessage({ text: "", visible: false }), duration);
  };
  const getGameCanvasDimensions = useCallback(() => {
    const canvas = gameCanvasRef.current;
    return {
      width: canvas?.width || canvas?.clientWidth || 0,
      height: canvas?.height || canvas?.clientHeight || 0,
    };
  }, []);
  // ==================== ANGLE COMPUTATION HELPERS ====================
  const vecSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const vecDot = (a, b) => a.x * b.x + a.y * b.y;
  const vecMag = (v) => Math.hypot(v.x, v.y);
  const vecAngleDeg = (a, b) => {
    const mag = vecMag(a) * vecMag(b);
    if (mag === 0) return -1;
    const cos = Math.max(-1, Math.min(1, vecDot(a, b) / mag));
    return Math.round((Math.acos(cos) * 180) / Math.PI);
  };
  // Compute the 3 angles for one side (left or right)
  // Returns { elbowAngle, shoulderAngle, verticalAngle } — all -1 if invisible
  const computeSideAngles = useCallback((shoulder, otherShoulder, elbow, wrist) => {
    if (!shoulder || !elbow) return { elbowAngle: -1, shoulderAngle: -1, verticalAngle: -1 };
    const w = 640, h = 480;
    const sh = { x: shoulder.x * w, y: shoulder.y * h };
    const el = { x: elbow.x * w, y: elbow.y * h };
    // 1. Elbow angle — needs wrist
    const elbowAngle = wrist
      ? vecAngleDeg(vecSub(sh, el), vecSub({ x: wrist.x * w, y: wrist.y * h }, el))
      : -1;
    // 2. Shoulder abduction — needs both shoulders
    const shoulderAngle = otherShoulder
      ? vecAngleDeg(vecSub({ x: otherShoulder.x * w, y: otherShoulder.y * h }, sh), vecSub(el, sh))
      : -1;
    // 3. Vertical angle — upper arm vs vertical down
    const verticalAngle = vecAngleDeg(vecSub(el, sh), { x: 0, y: 1 });
    return { elbowAngle, shoulderAngle, verticalAngle };
  }, []);

  const makeTracePoint = useCallback((point, zone = "safe", color = "#51cf66") => {
    const canvas = getGameCanvasDimensions();
    const handState = handStateRef.current;
    const pose = lastPoseResultsRef.current;

    let leftShoulder = null;
    let rightShoulder = null;
    let leftElbow = null;
    let rightElbow = null;
    let leftWrist = null;
    let rightWrist = null;

    if (pose && pose.poseLandmarks) {
      const pl = pose.poseLandmarks;
      if (pl[11] && pl[11].visibility > 0.5) leftShoulder = { x: pl[11].x, y: pl[11].y };
      if (pl[12] && pl[12].visibility > 0.5) rightShoulder = { x: pl[12].x, y: pl[12].y };
      if (pl[13] && pl[13].visibility > 0.5) leftElbow = { x: pl[13].x, y: pl[13].y };
      if (pl[14] && pl[14].visibility > 0.5) rightElbow = { x: pl[14].x, y: pl[14].y };
      if (pl[15] && pl[15].visibility > 0.5) leftWrist = { x: pl[15].x, y: pl[15].y };
      if (pl[16] && pl[16].visibility > 0.5) rightWrist = { x: pl[16].x, y: pl[16].y };
    }

    if (handState.Left.landmarks && handState.Left.landmarks[0]) {
      leftWrist = { x: handState.Left.landmarks[0].x, y: handState.Left.landmarks[0].y };
    }
    if (handState.Right.landmarks && handState.Right.landmarks[0]) {
      rightWrist = { x: handState.Right.landmarks[0].x, y: handState.Right.landmarks[0].y };
    }

    // Compute biomechanical angles for both sides
    const leftAngles  = computeSideAngles(leftShoulder, rightShoulder, leftElbow, leftWrist);
    const rightAngles = computeSideAngles(rightShoulder, leftShoulder, rightElbow, rightWrist);

    return {
      x: point.x,
      y: point.y,
      screenX: canvas.width ? point.x * canvas.width : undefined,
      screenY: canvas.height ? point.y * canvas.height : undefined,
      timestamp: nowSec(),
      zone,
      color,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      palm: { x: point.x, y: point.y },
      elbowAngleLeft:    leftAngles.elbowAngle,
      shoulderAngleLeft: leftAngles.shoulderAngle,
      verticalAngleLeft: leftAngles.verticalAngle,
      elbowAngleRight:    rightAngles.elbowAngle,
      shoulderAngleRight: rightAngles.shoulderAngle,
      verticalAngleRight: rightAngles.verticalAngle,
    };
  }, [getGameCanvasDimensions, nowSec, computeSideAngles]);
  const copyPoint = (point) => ({
    x: point.x,
    y: point.y,
    screenX: point.screenX,
    screenY: point.screenY,
    timestamp: point.timestamp,
    zone: point.zone,
    color: point.color,
    leftShoulder:  point.leftShoulder  ? { x: point.leftShoulder.x,  y: point.leftShoulder.y  } : null,
    rightShoulder: point.rightShoulder ? { x: point.rightShoulder.x, y: point.rightShoulder.y } : null,
    leftElbow:     point.leftElbow     ? { x: point.leftElbow.x,     y: point.leftElbow.y     } : null,
    rightElbow:    point.rightElbow    ? { x: point.rightElbow.x,    y: point.rightElbow.y    } : null,
    leftWrist:     point.leftWrist     ? { x: point.leftWrist.x,     y: point.leftWrist.y     } : null,
    rightWrist:    point.rightWrist    ? { x: point.rightWrist.x,    y: point.rightWrist.y    } : null,
    palm:          point.palm          ? { x: point.palm.x,          y: point.palm.y          } : null,
    elbowAngleLeft:    point.elbowAngleLeft    ?? -1,
    shoulderAngleLeft: point.shoulderAngleLeft ?? -1,
    verticalAngleLeft: point.verticalAngleLeft ?? -1,
    elbowAngleRight:    point.elbowAngleRight    ?? -1,
    shoulderAngleRight: point.shoulderAngleRight ?? -1,
    verticalAngleRight: point.verticalAngleRight ?? -1,
  });
  const buildBoardDrawingAttempt = useCallback(({
    shape,
    hand,
    hits,
    total,
    completion,
    success,
    scoreAfter,
    traceQuality,
    pointsEarned,
    safeZoneRadius,
    warningZoneRadius,
  }) => {
    const canvas = getGameCanvasDimensions();
    const closePath = (points) => {
      const copied = points.map((point) => ({
        x: point.x,
        y: point.y,
        screenX: canvas.width ? point.x * canvas.width : undefined,
        screenY: canvas.height ? point.y * canvas.height : undefined,
      }));
      if (copied.length > 0) copied.push({ ...copied[0] });
      return copied;
    };
    const drawnPath = drawnPathRef.current.map(copyPoint);
    const targetPath = closePath(shape.points);
    return {
      attemptNumber: attemptsRef.current + 1,
      requestedShape: shape.type,
      shapeType: shape.type,
      hand,
      startedAt: activeAttemptStartedAtRef.current,
      endedAt: nowSec(),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      targetPath,
      drawnPath,
      pathMatrix: drawnPath.map((point) => [
        point.screenX ?? point.x,
        point.screenY ?? point.y,
        point.timestamp ?? 0,
      ]),
      hits,
      total,
      completion,
      success,
      scoreAfter,
      traceQuality,
      pointsEarned,
      safeZoneRadius,
      warningZoneRadius,
    };
  }, [getGameCanvasDimensions, nowSec]);
  const safeCloseModule = useCallback((moduleRef, moduleName) => {
    if (!moduleRef.current) return;
    try {
      moduleRef.current.close();
    } catch (error) {
      const errMsg = error ? (error.message || String(error)) : "";
      if (!errMsg.includes("already deleted")) {
        console.warn(`Failed to close ${moduleName}:`, error);
      }
    } finally {
      moduleRef.current = null;
    }
  }, []);
  const buildBufferedSessionData = useCallback(() => {
    const playData = logsRef.current.map((log) => {
      const {
        event,
        score: eventScore,
        hand,
        timestamp,
        shape_type,
        ...metaFields
      } = log;
      const meta = Object.fromEntries(
        Object.entries(metaFields).filter(([, value]) => value !== undefined),
      );
      const entry = {
        eventName: event,
        score: eventScore,
        hand,
        responsetime: timestamp,
        shapeType: shape_type,
      };
      if (Object.keys(meta).length > 0) {
        entry.meta = meta;
      }
      return entry;
    });
    return {
      sessionScore: scoreRef.current,
      playData,
      coordinates: coordinateLogRef.current.map((point) => ({ ...point })),
      boardDrawingAttempts: boardDrawingAttemptsRef.current.map((attempt) => ({
        ...attempt,
        targetPath: attempt.targetPath?.map((point) => ({ ...point })) || [],
        drawnPath: attempt.drawnPath?.map((point) => ({ ...point })) || [],
        pathMatrix: attempt.pathMatrix?.map((row) => [...row]) || [],
      })),
    };
  }, []);
  const persistBoardDrawingBuffer = useCallback(() => {
    gameSessionBuffer.update(buildBufferedSessionData());
    // Also persist latest attempt to local storage
    if (localGameIdRef.current && boardDrawingAttemptsRef.current.length > 0) {
      const latest = boardDrawingAttemptsRef.current[boardDrawingAttemptsRef.current.length - 1];
      GameStorage.recordTry(localGameIdRef.current, latest);
    }
  }, [buildBufferedSessionData]);
  const finalizeActiveDrawingAttempt = useCallback(() => {
    const shape = shapeRef.current;
    if (!shape?.drawingHand || drawnPathRef.current.length < 2) return false;

    const hits = currentTargetIdxRef.current;
    const total = shape.points.length;
    const completion = total > 0 ? hits / total : 0;
    boardDrawingAttemptsRef.current.push(
      buildBoardDrawingAttempt({
        shape,
        hand: shape.drawingHand,
        hits,
        total,
        completion,
        success: completion >= 1.0,
        scoreAfter: scoreRef.current,
      }),
    );
    logsRef.current.push({
      timestamp: nowSec(),
      event: "drawing_interrupted",
      shape_type: shape.type,
      hand: shape.drawingHand,
      hits,
      total,
      completion,
    });
    shape.drawingHand = null;
    activeAttemptStartedAtRef.current = null;
    attemptsRef.current++;
    persistBoardDrawingBuffer();
    return true;
  }, [buildBoardDrawingAttempt, nowSec, persistBoardDrawingBuffer]);

  const handleEndSession = useCallback(async () => {
    setIsSessionActive(false);
    finalizeActiveDrawingAttempt();
    logsRef.current.push({
      timestamp: nowSec(),
      event: "session_end",
      score: scoreRef.current,
      reps,
    });
    const successRateVal =
      attemptsRef.current > 0
        ? ((successesRef.current / attemptsRef.current) * 100).toFixed(1)
        : 0;

    persistBoardDrawingBuffer();

    // Finalize local storage game record
    if (localGameIdRef.current) {
      GameStorage.finalizeGame(localGameIdRef.current, {
        score: scoreRef.current,
        reps,
        successRate: parseFloat(successRateVal),
        currentShapePoints: shapeRef.current?.points ?? [],
      });
      setShowAnalyticsBtn(true);
    }

    // Show completion dialog — OK saves immediately and navigates to dashboard
    const wantsSave = window.confirm(
      `Session Complete! 🎉\n\nScore: ${scoreRef.current}\nShapes Completed: ${reps}\nSuccess Rate: ${successRateVal}%\n\nPress OK to Save & Exit, or Cancel to stay on the page.`
    );
    if (wantsSave) {
      try {
        if (gameSessionBuffer.hasPending()) {
          await gameSessionBuffer.saveAndExit();
        }
        const { user } = JSON.parse(localStorage.getItem("user") || "{}");
        const dashPath = user?.type === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
        navigate(dashPath);
      } catch (err) {
        console.error("Failed to save session:", err);
        const exitAnyway = window.confirm("Failed to save to server.\n\nExit anyway without saving?");
        if (exitAnyway) {
          gameSessionBuffer.discard();
          const { user } = JSON.parse(localStorage.getItem("user") || "{}");
          const dashPath = user?.type === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
          navigate(dashPath);
        }
      }
    }
  }, [finalizeActiveDrawingAttempt, nowSec, reps, persistBoardDrawingBuffer, navigate]);

  const sequenceIndexRef = useRef(0);

  // ==================== SPAWN SHAPE ====================
  const pickNewShape = useCallback(() => {
    // Determine shape by level
    const level = calibrationRef.current.level || 1;
    let shapeType;

    if (globalSettings?.testingMode) {
      const seq = globalSettings?.testingShapeSequence?.length > 0 ? globalSettings.testingShapeSequence : TESTING_SHAPE_SEQUENCE;
      if (sequenceIndexRef.current >= seq.length) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
        handleEndSession();
        return false;
      }
      shapeType = seq[sequenceIndexRef.current];
      sequenceIndexRef.current++;
    } else {
      shapeType = selectedShapeRef.current === "random" ? SHAPES[Math.floor(Math.random() * SHAPES.length)] : selectedShapeRef.current;
    }

    const points = generateShapePoints(shapeType);
    shapeRef.current = {
      type: shapeType,
      points,
      drawingHand: null,
      startTime: Date.now(),
    };
    currentTargetIdxRef.current = 0;
    drawnPathRef.current = [];
    setStatusMessage({
      text: `Level ${level}: Trace the ${shapeType.toUpperCase()}`,
      visible: true,
    });
    setTimeout(
      () => setStatusMessage((prev) => ({ ...prev, visible: false })),
      2000,
    );
    return true;
  }, [globalSettings, handleEndSession]);

  const spawnShape = useCallback(() => {
    const success = pickNewShape();
    if (!success) return;
    
    logsRef.current.push({
      timestamp: nowSec(),
      event: "spawn_shape",
      shape_type: shapeRef.current.type,
      num_points: shapeRef.current.points.length,
      score: scoreRef.current,
    });
    // Keep local storage bgCoordinates in sync with current shape
    if (localGameIdRef.current) {
      GameStorage.updateBgCoordinates(localGameIdRef.current, shapeRef.current.points);
    }

    if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
    if (globalSettings?.testingMode) {
      const timerSec = globalSettings.testingShapeTimer || 120;
      shapeTimerRef.current = setTimeout(() => {
        if (isSessionActiveRef.current) {
          showStatus("⏱️ Shape time's up! Saving partial attempt and moving on...", 2500);
          if (shapeRef.current) {
            // Save whatever was drawn so far — give partial points
            finalizeActiveDrawingAttempt();
            logsRef.current.push({
              timestamp: nowSec(),
              event: "shape_timeout",
              shape_type: shapeRef.current.type,
            });
          }
          currentTargetIdxRef.current = 0;
          drawnPathRef.current = [];
          spawnShape();
        }
      }, timerSec * 1000);
    }
  }, [pickNewShape, nowSec, globalSettings, finalizeActiveDrawingAttempt]);

  // ==================== MEDIAPIPE HANDLERS ====================
  const onHandsResults = useCallback((results) => {
    const handState = handStateRef.current;

    handState.Left.visible = false;
    if (!mouseStateRef.current.isDown) {
      handState.Right.visible = false;
      handState.Right.landmarks = null;
    }
    handState.Left.landmarks = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const lm = results.multiHandLandmarks[i];
        const label = results.multiHandedness[i].label;

        if (label === "Right" && mouseStateRef.current.isDown) {
          continue;
        }

        const palmCenter = {
          x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
          y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
        };
        const rawPos = { x: palmCenter.x, y: palmCenter.y };
        handState[label].pos = rawPos;
        handState[label].smoothPos = smoothPos(
          handState[label].smoothPos,
          rawPos,
        );
        handState[label].landmarks = lm;
        handState[label].visible = true;
        // Grasp detection
        const fingerPairs = [
          [8, 6],
          [12, 10],
          [16, 14],
          [20, 18],
        ];
        let curledFingers = 0;
        fingerPairs.forEach(([tipIdx, midIdx]) => {
          if (lm[tipIdx].y > lm[midIdx].y + 0.03) curledFingers++;
        });

        const thumbTipPoint = lm[4];
        const wrist = lm[0];
        const middleBase = lm[9];
        const thumbToPalm = Math.hypot(
          thumbTipPoint.x - palmCenter.x,
          thumbTipPoint.y - palmCenter.y,
        );
        const handSize =
          Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y) || 0.05;
        const normalizedThumbDist = thumbToPalm / handSize;
        const thumbClosed = normalizedThumbDist < 0.7;

        const fingerSpread = Math.hypot(lm[8].x - lm[20].x, lm[8].y - lm[20].y);
        const normalizedSpread = fingerSpread / handSize;
        const tightSpread = normalizedSpread < 0.8;

        const allTips = [4, 8, 12, 16, 20].map((idx) => lm[idx]);
        let avgDistToPalm = 0;
        allTips.forEach((tip) => {
          avgDistToPalm += Math.hypot(
            tip.x - palmCenter.x,
            tip.y - palmCenter.y,
          );
        });
        avgDistToPalm /= allTips.length;
        const normalizedCompactness = avgDistToPalm / handSize;
        const veryCompact = normalizedCompactness < 0.9;

        const isClosed =
          curledFingers === 4 ||
          (curledFingers >= 3 && thumbClosed) ||
          (curledFingers >= 2 && thumbClosed && tightSpread) ||
          (veryCompact && tightSpread && thumbClosed);

        if (i === 0 && showDebugRef.current) {
          setDebugInfo(`${label} Hand
Curled: ${curledFingers}/4
Thumb: ${thumbClosed ? "TUCKED" : "OUT"} (${normalizedThumbDist.toFixed(2)})
Spread: ${tightSpread ? "TIGHT" : "WIDE"} (${normalizedSpread.toFixed(2)})
Compact: ${veryCompact ? "YES" : "NO"} (${normalizedCompactness.toFixed(2)})
State: ${isClosed ? "🔴 CLOSED" : "🟢 OPEN"}`);
        }
        if (isClosed) {
          handState[label].closedFrames = Math.min(
            handState[label].closedFrames + 1,
            CONFIG.STABLE_FRAMES + 2,
          );
          handState[label].openFrames = 0;
        } else {
          handState[label].openFrames = Math.min(
            handState[label].openFrames + 1,
            CONFIG.STABLE_FRAMES + 2,
          );
          handState[label].closedFrames = 0;
        }
        handState[label].closed =
          handState[label].closedFrames >= CONFIG.STABLE_FRAMES;
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
          handState[label].shoulder = smoothPos(
            handState[label].shoulder,
            shoulder,
          );
        }
        if (pl[elbowIdx] && pl[elbowIdx].visibility > 0.5) {
          const elbow = { x: pl[elbowIdx].x, y: pl[elbowIdx].y };
          handState[label].elbow = smoothPos(handState[label].elbow, elbow);
        }
      };
      update("Left", 11, 13);
      update("Right", 12, 14);
      if (calibrationRef.current.active) {
        ["Left", "Right"].forEach((label) => {
          if (handState[label].smoothPos) {
            calibrationRef.current.minX = Math.min(
              calibrationRef.current.minX,
              handState[label].smoothPos.x,
            );
            calibrationRef.current.maxX = Math.max(
              calibrationRef.current.maxX,
              handState[label].smoothPos.x,
            );
            calibrationRef.current.minY = Math.min(
              calibrationRef.current.minY,
              handState[label].smoothPos.y,
            );
            calibrationRef.current.maxY = Math.max(
              calibrationRef.current.maxY,
              handState[label].smoothPos.y,
            );
          }
        });
      }
    }
  }, []);

  // ==================== SETUP MEDIAPIPE ====================
  const setupMediaPipe = useCallback(async () => {
    if (handsModuleRef.current || poseModuleRef.current) {
      console.log("MediaPipe already initialized, skipping.");
      return;
    }
    if (!Hands || !Pose || !Camera) {
      console.error("MediaPipe libraries not loaded");
      return;
    }
    try {
      handsModuleRef.current = new Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      handsModuleRef.current.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      handsModuleRef.current.onResults(onHandsResults);
      poseModuleRef.current = new Pose({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
      });
      poseModuleRef.current.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: true,
      });
      poseModuleRef.current.onResults(onPoseResults);
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!videoRef.current) return;
          if (isUnmountingRef.current) return;
          if (!usingMouseFallbackRef.current && isInitializedRef.current) {
            const handsModule = handsModuleRef.current;
            const poseModule = poseModuleRef.current;
            if (!handsModule || !poseModule) return;
            try {
              await handsModule.send({ image: videoRef.current });
              await poseModule.send({ image: videoRef.current });
            } catch (error) {
              if (!String(error?.message || "").includes("already deleted")) {
                console.warn("MediaPipe frame processing error:", error);
              }
            }
          }
        },
        width: 640,
        height: 480,
      });
      await cameraRef.current.start();
      setIsInitialized(true);
      isInitializedRef.current = true;
      console.log("✓ Camera started successfully");
    } catch (e) {
      console.warn("Camera failed:", e);
      alert(
        "Camera unavailable. Enable mouse fallback to test without webcam.",
      );
    }
  }, [onHandsResults, onPoseResults]);

  // ==================== GAME LOGIC ====================
  const gameLogicTick = useCallback(() => {
    if (!shapeRef.current || !sessionStartRef.current) return;
    const handState = handStateRef.current;
    const shape = shapeRef.current;
    ["Left", "Right"].forEach((label) => {
      const hand = handState[label];
      const isDrawing = shape.drawingHand === label;
      if (!hand.smoothPos || (!hand.visible && !isDrawing)) return;
      const pos = hand.smoothPos;
      const isDrawingTriggered = handPoseModeRef.current === "any" 
        ? hand.visible 
        : (hand.visible && hand.closed);

      if (!isDrawingTriggered) {
        gestureResetRequiredRef.current = false;
      }
      if (gestureResetRequiredRef.current) {
        if (distNorm(pos, shape.points[0]) >= CONFIG.TRACE_TOLERANCE) {
          gestureResetRequiredRef.current = false;
        }
      }
      if (gestureResetRequiredRef.current) return;
      
      // Track downsampled coordinates for relative hand trajectory visualization
      const coordSampleMs = globalSettings?.boardDrawingCoordSampleMs ?? BOARD_DRAWING_COORD_SAMPLE_MS;
      if (sessionStartRef.current && Date.now() - lastCoordTimeRef.current > coordSampleMs) {
        if (coordinateLogRef.current.length < MAX_COORDS_PER_SESSION) {
          // Capture current joint positions and angles
          const pose = lastPoseResultsRef.current;
          let ls = null, rs = null, le = null, re = null, lw = null, rw = null;
          if (pose && pose.poseLandmarks) {
            const pl = pose.poseLandmarks;
            if (pl[11]?.visibility > 0.5) ls = { x: pl[11].x, y: pl[11].y };
            if (pl[12]?.visibility > 0.5) rs = { x: pl[12].x, y: pl[12].y };
            if (pl[13]?.visibility > 0.5) le = { x: pl[13].x, y: pl[13].y };
            if (pl[14]?.visibility > 0.5) re = { x: pl[14].x, y: pl[14].y };
            if (pl[15]?.visibility > 0.5) lw = { x: pl[15].x, y: pl[15].y };
            if (pl[16]?.visibility > 0.5) rw = { x: pl[16].x, y: pl[16].y };
          }
          const hState = handStateRef.current;
          if (hState.Left.landmarks?.[0])  lw = { x: hState.Left.landmarks[0].x,  y: hState.Left.landmarks[0].y };
          if (hState.Right.landmarks?.[0]) rw = { x: hState.Right.landmarks[0].x, y: hState.Right.landmarks[0].y };
          const lAngles = computeSideAngles(ls, rs, le, lw);
          const rAngles = computeSideAngles(rs, ls, re, rw);
          coordinateLogRef.current.push({
            x: pos.x,
            y: pos.y,
            timestamp: nowSec(),
            leftShoulder: ls, rightShoulder: rs,
            leftElbow: le, rightElbow: re,
            leftWrist: lw, rightWrist: rw,
            elbowAngleLeft:    lAngles.elbowAngle,
            shoulderAngleLeft: lAngles.shoulderAngle,
            verticalAngleLeft: lAngles.verticalAngle,
            elbowAngleRight:    rAngles.elbowAngle,
            shoulderAngleRight: rAngles.shoulderAngle,
            verticalAngleRight: rAngles.verticalAngle,
          });
        }
        lastCoordTimeRef.current = Date.now();
      }

      if (
        !shape.drawingHand &&
        isDrawingTriggered &&
        drawnPathRef.current.length === 0
      ) {
        // Only start drawing if the hand is near the FIRST point
        if (distNorm(pos, shape.points[0]) < CONFIG.TRACE_TOLERANCE) {
          shape.drawingHand = label;
          activeAttemptStartedAtRef.current = nowSec();
          const startPoint = makeTracePoint(pos, "safe", "#51cf66");
          drawnPathRef.current = [startPoint];
          currentTargetIdxRef.current = 1;
          
          logsRef.current.push({
            timestamp: nowSec(),
            event: "start_drawing",
            shape_type: shape.type,
            hand: label,
          });
          showStatus(
            `✏️ ${label} hand started drawing! Follow the points in order.`,
            1500,
          );
        }
      } else if (isDrawing) {
        const autoComplete = (handPoseModeRef.current === "any" && currentTargetIdxRef.current >= shape.points.length + 1);
        
        if (isDrawingTriggered && !autoComplete) {
          const distToOutline = getMinDistanceToShapeOutline(pos, shape.points);
          let zone = "safe";
          let color = "#51cf66";
          if (distToOutline >= warningZoneRadiusRef.current) {
            zone = "danger";
            color = "#ff6b6b";
          } else if (distToOutline >= safeZoneRadiusRef.current) {
            zone = "warning";
            color = "#fcc419";
          }
          const tracedPoint = makeTracePoint(pos, zone, color);
          drawnPathRef.current.push(tracedPoint);
          // Advance targets if close
          while (
            currentTargetIdxRef.current < shape.points.length &&
            distNorm(pos, shape.points[currentTargetIdxRef.current]) <
            CONFIG.TRACE_TOLERANCE
          ) {
            currentTargetIdxRef.current++;
          }
          if (currentTargetIdxRef.current === shape.points.length) {
            if (distNorm(pos, shape.points[0]) < CONFIG.TRACE_TOLERANCE) {
              currentTargetIdxRef.current++;
            }
          }
          if (currentTargetIdxRef.current >= shape.points.length + 1) {
            if (handPoseModeRef.current === "any") {
              // Will be auto-completed immediately below
            } else {
              showStatus(
                "All points reached! Open hand to complete the shape.",
                1000,
              );
            }
          }
        }
        
        const shouldEndDrawing = !isDrawingTriggered || autoComplete;

        if (shouldEndDrawing) {
          // Open hand - end drawing (or auto-completed)
          shape.drawingHand = null;
          const hits = Math.min(currentTargetIdxRef.current, shape.points.length + 1);
          const total = shape.points.length + 1;
          const completion = hits / total;

          const path = drawnPathRef.current;
          const safeCount = path.filter(p => p.zone === 'safe').length;
          const warningCount = path.filter(p => p.zone === 'warning').length;
          const dangerCount = path.filter(p => p.zone === 'danger').length;
          const totalPoints = path.length;
          const traceQuality = totalPoints > 0 ? Math.round(((safeCount * 1.0 + warningCount * 0.5 + dangerCount * 0.1) / totalPoints) * 100) : 100;

          // Partial Scoring Algorithm with Complexity Multiplier and Quality Degrader
          const multiplier = SHAPE_COMPLEXITY_MULTIPLIERS[shape.type] || 1;
          const pointsEarned = Math.round(hits * (1 + (hits / total)) * multiplier * (traceQuality / 100));
          const newScore = scoreRef.current + pointsEarned;
          setScore(newScore);
          scoreRef.current = newScore;

          logsRef.current.push({
            timestamp: nowSec(),
            event: "end_drawing",
            shape_type: shape.type,
            hand: label,
            hits,
            total,
            completion,
          });
          if (completion >= 1.0) {  // 100% completion required
            // Shape Success!
            const newReps = reps + 1;
            setReps(newReps);
            successesRef.current++;

            // Advance level every 3 shapes
            if (newReps % 3 === 0) {
              calibrationRef.current.level =
                (calibrationRef.current.level || 1) + 1;
            }

            boardDrawingAttemptsRef.current.push(
              buildBoardDrawingAttempt({
                shape,
                hand: label,
                hits,
                total,
                completion,
                success: true,
                scoreAfter: newScore,
                traceQuality,
                pointsEarned,
                safeZoneRadius: safeZoneRadiusRef.current,
                warningZoneRadius: warningZoneRadiusRef.current,
              }),
            );
            persistBoardDrawingBuffer();
            activeAttemptStartedAtRef.current = null;
            attemptsRef.current++;
            logsRef.current.push({
              timestamp: nowSec(),
              event: "drawing_success",
              shape_type: shape.type,
              hand: label,
              hits,
              total,
              score: newScore,
            });
            const newRate = (
              (successesRef.current / attemptsRef.current) *
              100
            ).toFixed(0);
            setSuccessRate(newRate);
            const multText = multiplier > 1 ? ` (${multiplier}x complexity)` : "";
            showStatus(
              `✅ Shape completed! ${Math.round(completion * 100)}% accuracy (Quality: ${traceQuality}%) +${pointsEarned} points${multText}`,
              2000,
            );
            gestureResetRequiredRef.current = true;
            if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
            spawnShape();
          } else {
            boardDrawingAttemptsRef.current.push(
              buildBoardDrawingAttempt({
                shape,
                hand: label,
                hits,
                total,
                completion,
                success: false,
                scoreAfter: newScore,
                traceQuality,
                pointsEarned,
                safeZoneRadius: safeZoneRadiusRef.current,
                warningZoneRadius: warningZoneRadiusRef.current,
              }),
            );
            persistBoardDrawingBuffer();
            activeAttemptStartedAtRef.current = null;
            attemptsRef.current++;
            logsRef.current.push({
              timestamp: nowSec(),
              event: "drawing_fail",
              shape_type: shape.type,
              hand: label,
              hits,
              total,
              completion,
            });
            const newRate = (
              (successesRef.current / attemptsRef.current) *
              100
            ).toFixed(0);
            setSuccessRate(newRate);
            const retryAction = handPoseModeRef.current === "any" ? "Hover starting point to retry." : "Close hand to retry.";
            showStatus(
              `⚠️ Partial trace: ${Math.round(completion * 100)}% (Quality: ${traceQuality}%) (+${pointsEarned} pts) - ${retryAction}`,
              2000,
            );
            currentTargetIdxRef.current = 0;
            drawnPathRef.current = [];
          }
        }
      }
    });
  }, [spawnShape, reps, nowSec, buildBoardDrawingAttempt, persistBoardDrawingBuffer, makeTracePoint]);

  // ==================== DRAWING ====================
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    if (lastPoseResultsRef.current?.poseLandmarks) {
      const pl = lastPoseResultsRef.current.poseLandmarks;
      [
        [11, "L-Sh"],
        [12, "R-Sh"],
        [13, "L-El"],
        [14, "R-El"],
      ].forEach(([idx]) => {
        if (!pl[idx] || pl[idx].visibility < 0.5) return;
        const x = pl[idx].x * w;
        const y = pl[idx].y * h;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 200, 0, 0.8)";
        ctx.fill();
      });
    }
    const handState = handStateRef.current;
    ["Left", "Right"].forEach((label) => {
      const hand = handState[label];
      if (!hand.landmarks || !hand.visible) return;
      const lm = hand.landmarks;
      const canDraw = handPoseModeRef.current === "any" ? true : hand.closed;
      const color = canDraw
        ? "rgba(50, 200, 80, 0.9)" // green for can draw
        : "rgba(220, 50, 50, 0.9)"; // red for cannot draw

      const palmCenter = {
        x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
        y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
      };

      const connections = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [0, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        [0, 13],
        [13, 14],
        [14, 15],
        [15, 16],
        [0, 17],
        [17, 18],
        [18, 19],
        [19, 20],
        [5, 9],
        [9, 13],
        [13, 17],
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
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      const pcx = palmCenter.x * w;
      const pcy = palmCenter.y * h;
      ctx.beginPath();
      ctx.arc(pcx, pcy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = color;
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
      ctx.fillStyle = color;
      ctx.fill();
      const stateText = canDraw ? "CAN DRAW" : "CANNOT DRAW";
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(pcx + 20, pcy - 16, 140, 26);

      ctx.fillStyle = color;
      ctx.font = "bold 14px Arial";
      ctx.fillText(`${label} ${stateText}`, pcx + 26, pcy);
    });
  }, []);

  const drawGame = useCallback(() => {
    const canvas = gameCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    const scale = window.devicePixelRatio || 1;
    if (shapeRef.current) {
      const shape = shapeRef.current;
      
      // Draw warning zone buffer halo
      ctx.strokeStyle = isDarkMode ? "rgba(252, 196, 25, 0.15)" : "rgba(252, 196, 25, 0.2)";
      ctx.lineWidth = warningZoneRadiusRef.current * 2 * w; // dynamic double warning radius
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x * w, shape.points[0].y * h);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x * w, shape.points[i].y * h);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw safe zone buffer halo
      ctx.strokeStyle = isDarkMode ? "rgba(81, 207, 102, 0.2)" : "rgba(81, 207, 102, 0.35)";
      ctx.lineWidth = safeZoneRadiusRef.current * 2 * w; // dynamic double safe radius
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x * w, shape.points[0].y * h);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x * w, shape.points[i].y * h);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw shape outline
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x * w, shape.points[0].y * h);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x * w, shape.points[i].y * h);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw points
      shape.points.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        let fillColor;
        if (currentTargetIdxRef.current === shape.points.length) {
          fillColor = (i === 0 ? "#dc3545" : "#28a745");
        } else if (currentTargetIdxRef.current > shape.points.length) {
          fillColor = "#28a745";
        } else {
          fillColor =
            i < currentTargetIdxRef.current
              ? "#28a745" // green for hit
              : i === currentTargetIdxRef.current
                ? "#dc3545" // red for current
                : "#007bff"; // blue for future
        }
        ctx.beginPath();
        ctx.fillStyle = fillColor;
        ctx.arc(px, py, 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      });

      // Draw drawn path
      if (drawnPathRef.current.length > 1) {
        ctx.lineWidth = 4 * scale;
        for (let i = 1; i < drawnPathRef.current.length; i++) {
          const p1 = drawnPathRef.current[i - 1];
          const p2 = drawnPathRef.current[i];
          ctx.strokeStyle = p2.color || "#ff9500";
          ctx.beginPath();
          ctx.moveTo(
            p1.x * w,
            p1.y * h,
          );
          ctx.lineTo(
            p2.x * w,
            p2.y * h,
          );
          ctx.stroke();
        }
      }
    }
    const handState = handStateRef.current;
    ["Left", "Right"].forEach((label) => {
      const hand = handState[label];
      if (!hand.smoothPos || !hand.visible) return;
      const px = hand.smoothPos.x * w;
      const py = hand.smoothPos.y * h;

      const canDraw = handPoseModeRef.current === "any" ? true : hand.closed;
      ctx.beginPath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.arc(px + 2, py + 2, 14 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = canDraw
        ? "rgba(50, 200, 80, 0.95)" // green for can draw
        : "rgba(220, 50, 50, 0.95)" // red for cannot draw
      ctx.arc(px, py, 14 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${12 * scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
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
      const targetW =
        gameCanvasRef.current.clientWidth * (window.devicePixelRatio || 1);
      const targetH =
        gameCanvasRef.current.clientHeight * (window.devicePixelRatio || 1);

      if (
        gameCanvasRef.current.width !== targetW ||
        gameCanvasRef.current.height !== targetH
      ) {
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
    animationFrameRef.current = requestAnimationFrame(mainLoop);
  }, [syncCanvasSizes, drawOverlay, drawGame, gameLogicTick]);

  // ==================== EVENT HANDLERS ====================
  const handleStartCalibration = () => {
    calibrationRef.current.active = true;
    calibrationRef.current.minX = 1;
    calibrationRef.current.maxX = 0;
    calibrationRef.current.minY = 1;
    calibrationRef.current.maxY = 0;

    setIsCalibrating(true);
    setCalibTimeLeft(7); // Changed from CONFIG.CALIBRATION_SECONDS to 7

    // Auto-advance if landmarks are already stable
    const checkStableInterval = setInterval(() => {
      if (calibrationRef.current.maxX > 0) {
        clearInterval(checkStableInterval);
        clearInterval(calibIntervalRef.current);
        finishCalibration();
      }
    }, 500);

    calibIntervalRef.current = setInterval(() => {
      setCalibTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(calibIntervalRef.current);
          clearInterval(checkStableInterval); // Clear the checkStableInterval too
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

    calibrationRef.current.centerX =
      (calibrationRef.current.minX + calibrationRef.current.maxX) / 2;
    calibrationRef.current.centerY =
      (calibrationRef.current.minY + calibrationRef.current.maxY) / 2;
    const dx = Math.max(
      Math.abs(calibrationRef.current.centerX - calibrationRef.current.minX),
      Math.abs(calibrationRef.current.centerX - calibrationRef.current.maxX),
    );
    const dy = Math.max(
      Math.abs(calibrationRef.current.centerY - calibrationRef.current.minY),
      Math.abs(calibrationRef.current.centerY - calibrationRef.current.maxY),
    );
    calibrationRef.current.maxReachNorm = Math.sqrt(dx * dx + dy * dy) || 0.2;
    calibrationRef.current.done = true;

    setCalibrationDone(true);
    logsRef.current.push({
      timestamp: 0,
      event: "calibration_complete",
      calibration: calibrationRef.current,
    });
    showStatus("✓ Calibration complete! Ready to start.");
  };

  const handleMouseDown = (e) => {
    if (!isSessionActive) return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = clamp((clientX - rect.left) / rect.width, 0.01, 0.99);
    const y = clamp((clientY - rect.top) / rect.height, 0.01, 0.99);

    const handState = handStateRef.current;
    handState.Right.pos = { x, y };
    handState.Right.smoothPos = { x, y };
    handState.Right.closed = true;
    handState.Right.closedFrames = CONFIG.STABLE_FRAMES;
    handState.Right.openFrames = 0;
    handState.Right.visible = true;

    setRightHandVisible(true);
    setRightHandClosed(true);

    mouseStateRef.current = { isDown: true, x, y };
  };

  const handleMouseMove = (e) => {
    if (!isSessionActive || !mouseStateRef.current.isDown) return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = clamp((clientX - rect.left) / rect.width, 0.01, 0.99);
    const y = clamp((clientY - rect.top) / rect.height, 0.01, 0.99);

    const handState = handStateRef.current;
    handState.Right.pos = { x, y };
    handState.Right.smoothPos = { x, y };
    handState.Right.visible = true;

    mouseStateRef.current.x = x;
    mouseStateRef.current.y = y;
  };

  const handleMouseUp = () => {
    if (!mouseStateRef.current.isDown) return;
    mouseStateRef.current.isDown = false;

    const handState = handStateRef.current;
    handState.Right.closed = false;
    handState.Right.closedFrames = 0;
    handState.Right.openFrames = CONFIG.STABLE_FRAMES;
    handState.Right.visible = false;

    setRightHandClosed(false);
    setRightHandVisible(false);
  };

  const handleTouchStart = (e) => {
    if (!isSessionActive || !e.touches || e.touches.length === 0) return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const x = clamp((clientX - rect.left) / rect.width, 0.01, 0.99);
    const y = clamp((clientY - rect.top) / rect.height, 0.01, 0.99);

    const handState = handStateRef.current;
    handState.Right.pos = { x, y };
    handState.Right.smoothPos = { x, y };
    handState.Right.closed = true;
    handState.Right.closedFrames = CONFIG.STABLE_FRAMES;
    handState.Right.openFrames = 0;
    handState.Right.visible = true;

    setRightHandVisible(true);
    setRightHandClosed(true);

    mouseStateRef.current = { isDown: true, x, y };
  };

  const handleTouchMove = (e) => {
    if (!isSessionActive || !mouseStateRef.current.isDown || !e.touches || e.touches.length === 0) return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const x = clamp((clientX - rect.left) / rect.width, 0.01, 0.99);
    const y = clamp((clientY - rect.top) / rect.height, 0.01, 0.99);

    const handState = handStateRef.current;
    handState.Right.pos = { x, y };
    handState.Right.smoothPos = { x, y };
    handState.Right.visible = true;

    mouseStateRef.current.x = x;
    mouseStateRef.current.y = y;
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const handleStartSession = () => {
    if (!calibrationDone) {
      if (!window.confirm("Calibration recommended. Continue anyway?")) return;
    }

    setScore(0);
    scoreRef.current = 0;
    setReps(0);
    attemptsRef.current = 0;
    successesRef.current = 0;
    logsRef.current = [];
    coordinateLogRef.current = [];
    boardDrawingAttemptsRef.current = [];
    activeAttemptStartedAtRef.current = null;
    lastCoordTimeRef.current = 0;
    sessionStartRef.current = Date.now();
    sequenceIndexRef.current = 0;

    const sessionSeconds = globalSettings?.testingMode
       ? (globalSettings?.testingShapeSessionSeconds || 600)
       : (globalSettings?.boardDrawingSessionSeconds || CONFIG.SESSION_SECONDS);
    
    spawnShape();
    setTimeRemaining(sessionSeconds);
    setSuccessRate(0);
    setIsSessionActive(true);

    // Start a local storage game record
    localGameIdRef.current = GameStorage.startGame(shapeRef.current?.points ?? []);
    setShowAnalyticsBtn(false);

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const remaining = Math.max(0, sessionSeconds - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        handleEndSession();
      }
    }, 1000);

    logsRef.current.push({ timestamp: 0, event: "session_start" });
    // Init local session buffer
    gameSessionBuffer.init('board_drawing', 'Board Drawing');
    showStatus(
      "🎮 Session started! Close hand near first point to begin tracing.",
      3000,
    );
  };



  const handleQuitOrBack = async () => {
    // Stop ALL timers immediately so no deferred callbacks fire after exit
    if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    shapeTimerRef.current = null;
    timerIntervalRef.current = null;

    const hasPending = gameSessionBuffer.hasPending();
    const dashPath = user?.type === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

    // 3-way choice: Save | Discard | Cancel
    const choice = window.confirm(
      hasPending
        ? "Leave the game?\n\n• OK → Save & Exit (saves your progress)\n• Cancel → opens Discard option"
        : "Leave the game? (No unsaved data)\n\n• OK → Exit\n• Cancel → Stay"
    );

    if (choice) {
      // OK = Save & Exit
      if (hasPending) {
        finalizeActiveDrawingAttempt();
        persistBoardDrawingBuffer();
        try {
          if (gameSessionBuffer.hasPending()) {
            await gameSessionBuffer.saveAndExit();
          }
        } catch (err) {
          console.error("Save failed:", err);
        }
      }
      navigate(dashPath);
    } else {
      if (!hasPending) return; // no data, cancel = stay
      // Second chance: discard or stay?
      const discard = window.confirm(
        "Discard all progress and exit?\n\n• OK → Discard & Exit\n• Cancel → Stay in game"
      );
      if (discard) {
        gameSessionBuffer.discard();
        navigate(dashPath);
      }
      // Cancel on discard prompt = stay in game (do nothing)
    }
  };

  const handleReset = () => {
    if (shapeTimerRef.current) clearTimeout(shapeTimerRef.current);
    window.location.reload();
  };






  // ==================== EFFECTS ====================
  useEffect(() => {
    isUnmountingRef.current = false;
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

  // Mount-only: initialize MediaPipe + camera ONCE. Never re-run on state changes.
  // Using a ref to hold setupMediaPipe so the dependency array stays stable.
  const setupMediaPipeRef = React.useRef(setupMediaPipe);
  setupMediaPipeRef.current = setupMediaPipe;
  const safeCloseModuleRef = React.useRef(safeCloseModule);
  safeCloseModuleRef.current = safeCloseModule;

  useEffect(() => {
    setupMediaPipeRef.current();

    const handleKeyDown = (e) => {
      if (e.key === "d" || e.key === "D") {
        setShowDebug((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      isUnmountingRef.current = true;
      document.removeEventListener("keydown", handleKeyDown);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (calibIntervalRef.current) clearInterval(calibIntervalRef.current);
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (error) {
          console.warn("Failed to stop camera:", error);
        } finally {
          cameraRef.current = null;
        }
      }
      safeCloseModuleRef.current(handsModuleRef, "hands");
      safeCloseModuleRef.current(poseModuleRef, "pose");
      isInitializedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount/unmount only

  // Separate effect to (re)start the animation loop when mainLoop ref changes
  const mainLoopRef = React.useRef(mainLoop);
  mainLoopRef.current = mainLoop;

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    const loop = () => {
      mainLoopRef.current();
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount/unmount only — mainLoopRef always has latest via ref

  // ==================== RENDER ====================
  // ==================== RENDER ====================
  const themeStyles = {
    container: {
      ...styles.container,
      background: isDarkMode ? "#000" : "#F4F7FE",
      color: isDarkMode ? "#fff" : "#333",
    },
    panel: {
      ...styles.panel,
      background: isDarkMode
        ? "rgba(17, 24, 39, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      borderRight: isDarkMode
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(20px)",
    },
    title: {
      ...styles.title,
      color: isDarkMode ? "#4ade80" : "#2f7a2f",
    },
    muted: {
      ...styles.muted,
      color: isDarkMode ? "#94a3b8" : "#575f56",
    },
    videoWrap: {
      ...styles.videoWrap,
      borderColor: isDarkMode ? "#1f2937" : "#eee",
      background: "#000",
    },
    statItem: {
      ...styles.statItem,
      background: isDarkMode ? "#111827" : "#f9f9f9",
      borderColor: isDarkMode ? "#1f2937" : "#eee",
    },
    statValue: {
      ...styles.statValue,
      color: isDarkMode ? "#4ade80" : "#2f7a2f",
    },
    statLabel: {
      ...styles.statLabel,
      color: isDarkMode ? "#94a3b8" : "#575f56",
    },
    note: {
      ...styles.note,
      background: isDarkMode
        ? "rgba(0, 0, 0, 0.3)"
        : "rgba(255, 255, 255, 0.5)",
      color: isDarkMode ? "#94a3b8" : "#575f56",
      borderTop: isDarkMode
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.05)",
    },
    statusMessage: {
      ...styles.statusMessage,
      background: isDarkMode
        ? "rgba(17, 24, 39, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      color: isDarkMode ? "#4ade80" : "#2f7a2f",
      border: isDarkMode ? "1px solid #4ade80" : "none",
    },
    actionButton: {
      ...styles.actionButton,
      background: isDarkMode ? "#374151" : "#e8e8e8",
      color: isDarkMode ? "#fff" : "#333",
    },
  };

  return (
    <div style={themeStyles.container}>
      <aside style={themeStyles.panel}>
        <h1 style={themeStyles.title}>Trace & Master</h1>
        <p style={themeStyles.muted}>
          A surgical-grade motor rehabilitation module. Follow the patterns with
          high precision.
        </p>

        <div style={themeStyles.videoWrap}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <canvas ref={overlayRef} style={styles.overlay} />

          {isCalibrating && (
            <div style={themeStyles.statusMessage}>
              Calibrating... {calibTimeLeft}s
            </div>
          )}

          <div style={styles.handStatus}>
            {(() => {
              const leftCanDraw = handPoseMode === "any" ? leftHandVisible : (leftHandVisible && leftHandClosed);
              const rightCanDraw = handPoseMode === "any" ? rightHandVisible : (rightHandVisible && rightHandClosed);
              return (
                <>
                  {leftHandVisible && (
                    <div
                      style={{
                        ...styles.handIndicator,
                        ...(leftCanDraw ? styles.handOpen : styles.handClosed),
                      }}
                    >
                      <span style={styles.dot}></span>
                      <span>Left {leftCanDraw ? "🟢 Can Draw" : "🔴 Cannot Draw"}</span>
                    </div>
                  )}
                  {rightHandVisible && (
                    <div
                      style={{
                        ...styles.handIndicator,
                        ...(rightCanDraw ? styles.handOpen : styles.handClosed),
                      }}
                    >
                      <span style={styles.dot}></span>
                      <span>Right {rightCanDraw ? "🟢 Can Draw" : "🔴 Cannot Draw"}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div style={styles.controls}>
          <button
            onClick={handleStartCalibration}
            style={styles.controlButton}
            disabled={isCalibrating}
          >
            📏 Calibrate System
          </button>
          <button onClick={handleStartSession} style={styles.controlButton}>
            {isSessionActive ? "⏸ Pause" : "▶️ Start Therapy"}
          </button>
          <button 
            onClick={toggleHandPoseMode} 
            style={{...styles.controlButton, background: handPoseMode === "strict" ? "#ff922b" : "#51cf66", marginTop: '10px'}}
          >
            {handPoseMode === "strict" ? "✊ Posture: Strict (Pinch to Draw)" : "✋ Posture: Any (Always Draw)"}
          </button>
          
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', background: isDarkMode ? '#1e293b' : '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid ' + (isDarkMode ? '#334155' : '#e2e8f0'), width: '100%' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: isDarkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
              🎯 Target Figure/Shape
            </div>
            <select
              value={selectedShape}
              onChange={(e) => setSelectedShape(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid ' + (isDarkMode ? '#475569' : '#cbd5e1'),
                background: isDarkMode ? '#0f172a' : '#ffffff',
                color: isDarkMode ? '#f8fafc' : '#0f172a',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="random">Randomize (Change Each Round)</option>
              {SHAPES.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: isDarkMode ? '#1e293b' : '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid ' + (isDarkMode ? '#334155' : '#e2e8f0'), width: '100%' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: isDarkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
              🔧 Tracing Zone Adjustments
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: isDarkMode ? '#cbd5e1' : '#334155', minWidth: '110px', textAlign: 'left' }}>
                🟢 Safe Zone: {(safeZoneRadius * 100).toFixed(1)}%
              </span>
              <input
                type="range"
                min="0.01"
                max="0.06"
                step="0.005"
                value={safeZoneRadius}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSafeZoneRadius(val);
                  safeZoneRadiusRef.current = val;
                  if (val > warningZoneRadius) {
                    setWarningZoneRadius(val + 0.01);
                    warningZoneRadiusRef.current = val + 0.01;
                  }
                }}
                style={{ flex: 1, accentColor: '#51cf66', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: isDarkMode ? '#cbd5e1' : '#334155', minWidth: '110px', textAlign: 'left' }}>
                🟡 Warning: {(warningZoneRadius * 100).toFixed(1)}%
              </span>
              <input
                type="range"
                min="0.02"
                max="0.12"
                step="0.005"
                value={warningZoneRadius}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val >= safeZoneRadius) {
                    setWarningZoneRadius(val);
                    warningZoneRadiusRef.current = val;
                  }
                }}
                style={{ flex: 1, accentColor: '#fcc419', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <div style={themeStyles.stats}>
          <div style={themeStyles.statItem}>
            <div style={themeStyles.statLabel}>Total Score</div>
            <div style={themeStyles.statValue}>{score}</div>
          </div>
          <div style={themeStyles.statItem}>
            <div style={themeStyles.statLabel}>Success Rate</div>
            <div style={themeStyles.statValue}>{Math.round(successRate)}%</div>
          </div>
          {/* <div style={themeStyles.statItem}>
            <div style={themeStyles.statLabel}>Shapes Done</div>
            <div style={themeStyles.statValue}>{reps}</div>
          </div> */}
          <div style={themeStyles.statItem}>
            <div style={themeStyles.statLabel}>Session Timer</div>
            <div style={themeStyles.statValue}>{formatTime(timeRemaining)}</div>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            onClick={handleQuitOrBack}
            style={themeStyles.actionButton}
          >
            Quit Session
          </button>
          <button onClick={handleReset} style={themeStyles.actionButton}>
            Reset
          </button>
        </div>

        {showAnalyticsBtn && (
          <button
            onClick={() => {
              // Open analytics in a new tab passing the game id
              const url = `/analytics?gameId=${localGameIdRef.current}`;
              window.open(url, '_blank');
            }}
            style={{
              ...styles.controlButton,
              marginTop: '10px',
              background: '#1565c0',
              width: '100%',
            }}
          >
            📊 View Game Analytics
          </button>
        )}

        <button
          onClick={() => window.open('/analytics', '_blank')}
          style={{
            ...themeStyles.actionButton,
            marginTop: '8px',
            width: '100%',
            fontSize: '12px',
            padding: '7px',
          }}
        >
          🗂 All Games History
        </button>

        <div style={themeStyles.note}>
          <strong style={themeStyles.statValue}>Clinical Focus:</strong> Fine
          motor precision and distal control.
        </div>
      </aside>

      <main style={styles.gameArea}>
        <canvas 
          ref={gameCanvasRef} 
          style={styles.gameCanvas} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {statusMessage.visible && (
          <div style={themeStyles.statusMessage}>{statusMessage.text}</div>
        )}
      </main>
      <SaveExitButton onBeforeSave={() => {
        finalizeActiveDrawingAttempt();
        persistBoardDrawingBuffer();
      }} />
    </div>
  );
};

// ==================== STYLES ====================
const styles = {
  container: {
    display: "flex",
    gap: "12px",
    padding: "12px",
    height: "100vh",
    background: "linear-gradient(#eaf7ea, #f6faf3)",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    overflow: "hidden",
  },
  panel: {
    width: "360px",
    background: "#fff",
    padding: "14px",
    borderRadius: "10px",
    boxShadow: "0 8px 20px rgba(20, 40, 20, 0.06)",
    overflowY: "auto",
  },
  title: {
    color: "#2f7a2f",
    margin: "0 0 8px",
    fontSize: "22px",
  },
  muted: {
    color: "#575f56",
    fontSize: "13px",
    margin: "0 0 12px",
    lineHeight: 1.4,
  },
  videoWrap: {
    position: "relative",
    height: "260px",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#111",
    border: "2px solid #ddd",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "auto",
  },
  calibOverlay: {
    position: "absolute",
    left: "8px",
    top: "8px",
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "6px",
    zIndex: 10,
    fontSize: "13px",
    fontWeight: 500,
    maxWidth: "280px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  calibText: {
    margin: 0,
  },
  handStatus: {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    display: "flex",
    gap: "8px",
    zIndex: 5,
  },
  handIndicator: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
  },
  handClosed: {
    background: "#dc3545",
  },
  handOpen: {
    background: "#28a745",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "white",
  },
  debugPanel: {
    position: "absolute",
    top: "8px",
    right: "8px",
    padding: "8px",
    background: "rgba(0, 0, 0, 0.85)",
    color: "#0f0",
    borderRadius: "4px",
    fontSize: "11px",
    fontFamily: "monospace",
    maxWidth: "200px",
    zIndex: 10,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
  },
  controlButton: {
    padding: "11px",
    borderRadius: "8px",
    border: 0,
    background: "#2f7a2f",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  buttonDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  checkboxLabel: {
    fontSize: "13px",
    color: "#575f56",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    cursor: "pointer",
  },
  stats: {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  statItem: {
    padding: "10px",
    background: "#f9f9f9",
    borderRadius: "6px",
    border: "1px solid #eee",
  },
  statLabel: {
    fontSize: "11px",
    color: "#575f56",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#2f7a2f",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  actionButton: {
    flex: 1,
    padding: "9px",
    borderRadius: "8px",
    border: 0,
    background: "#e8e8e8",
    color: "#333",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    transition: "background 0.2s",
  },
  note: {
    fontSize: "12px",
    color: "#575f56",
    marginTop: "12px",
    padding: "12px",
    background: "#f9f9f9",
    borderRadius: "6px",
    lineHeight: 1.6,
    borderLeft: "3px solid #2f7a2f",
  },
  noteTitle: {
    color: "#2f7a2f",
    display: "block",
    marginBottom: "6px",
  },
  gameArea: {
    flex: 1,
    display: "flex",
    alignItems: "stretch",
    position: "relative",
  },
  gameCanvas: {
    flex: 1,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #cfead1, #86c98a)",
    display: "block",
    width: "100%",
    height: "100%",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  statusMessage: {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255, 255, 255, 0.95)",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#2f7a2f",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 10,
    pointerEvents: "none",
    animation: "slideDown 0.3s ease",
  },
};

export default BoardDrawingGame;
