import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * ArmReachVisualizer — Full kinematic replay for Fruit Fetch sessions.
 *
 * Coordinate points schema (per point):
 *   x, y          — normalised hand/wrist position (0–1)
 *   hand          — "Left" | "Right"
 *   shoulder      — { x, y }  (normalised, may be null)
 *   elbow         — { x, y }  (normalised, may be null)
 *   elbowAngle    — degrees, -1 if invisible
 *   shoulderAngle — degrees, -1 if invisible
 *   verticalAngle — degrees, -1 if invisible
 *   timestamp     — seconds since session start
 */

const HAND_COLORS = {
  Left:    { stroke: "#6366f1", fill: "#6366f1", label: "Left Hand",  tailStroke: "#6366f1" },
  Right:   { stroke: "#10b981", fill: "#10b981", label: "Right Hand", tailStroke: "#10b981" },
  Unknown: { stroke: "#f59e0b", fill: "#f59e0b", label: "Hand",       tailStroke: "#f59e0b" },
};

const AngleMeter = ({ label, value, max = 180, color }) => {
  const isNA = value === -1 || value == null || value === undefined;
  const pct = isNA ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">{label}</span>
        <span className={`text-lg font-black ${color}`}>
          {isNA ? "N/A" : `${Math.round(value)}°`}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: isNA ? "#94a3b8" : undefined,
            backgroundColor: isNA ? undefined : color.includes("orange") ? "#f97316" : color.includes("amber") ? "#f59e0b" : color.includes("indigo") ? "#6366f1" : "#3b82f6",
          }}
        />
      </div>
    </div>
  );
};

const ArmReachVisualizer = ({ coordinates }) => {
  const [isPlaying, setIsPlaying]         = useState(false);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping]         = useState(false);
  const [showBothHands, setShowBothHands] = useState(true);
  const [tailLength, setTailLength]       = useState(30);
  const timerRef = useRef(null);

  // ── Filter and group by hand ──────────────────────────────────────────────
  const validCoords = useMemo(() =>
    Array.isArray(coordinates)
      ? coordinates.filter(p => p && typeof p.x === "number" && typeof p.y === "number")
      : [],
    [coordinates]
  );

  const leftCoords  = useMemo(() => validCoords.filter(p => p.hand === "Left"),  [validCoords]);
  const rightCoords = useMemo(() => validCoords.filter(p => p.hand === "Right"), [validCoords]);
  const hasLeft  = leftCoords.length > 0;
  const hasRight = rightCoords.length > 0;
  const hasBoth  = hasLeft && hasRight;

  // Reset when data changes
  useEffect(() => { setCurrentIdx(0); setIsPlaying(false); }, [coordinates]);

  // Playback ticker
  useEffect(() => {
    if (isPlaying) {
      const intervalTime = Math.max(10, Math.min(200, 150 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= validCoords.length - 1) {
            if (isLooping) return 0;
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalTime);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, validCoords.length, playbackSpeed, isLooping]);

  if (validCoords.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-150 dark:border-gray-700 text-center mt-6 shadow-sm">
        <div className="mb-3 text-5xl">💪</div>
        <p className="font-bold text-gray-800 dark:text-gray-200 mb-1 text-lg">No Arm Movement Data Yet</p>
        <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          Arm trajectory is recorded automatically during gameplay. Play a session to see your kinematic arm reach visualization.
        </p>
      </div>
    );
  }

  const safeIdx      = Math.min(currentIdx, validCoords.length - 1);
  const currentPoint = validCoords[safeIdx] || validCoords[0];
  const currentHand  = currentPoint.hand || "Unknown";
  const handColor    = HAND_COLORS[currentHand] || HAND_COLORS.Unknown;

  // ── Dynamic viewBox: include ALL recorded shoulder + elbow positions ───────
  const allX = [];
  const allY = [];
  validCoords.forEach(p => {
    allX.push(p.x);
    allY.push(p.y);
    if (p.shoulder) { allX.push(p.shoulder.x); allY.push(p.shoulder.y); }
    if (p.elbow)    { allX.push(p.elbow.x);    allY.push(p.elbow.y);    }
  });
  let minX = Math.min(...allX, 0.1);
  let maxX = Math.max(...allX, 0.9);
  let minY = Math.min(...allY, 0.1);
  let maxY = Math.max(...allY, 0.95);
  const padX = Math.max((maxX - minX) * 0.12, 0.08);
  const padY = Math.max((maxY - minY) * 0.12, 0.08);
  const vMinX  = (minX - padX) * 100;
  const vMinY  = (minY - padY) * 100;
  const vWidth = (maxX - minX + 2 * padX) * 100;
  const vHeight= (maxY - minY + 2 * padY) * 100;
  const viewBoxStr = `${vMinX} ${vMinY} ${vWidth} ${vHeight}`;

  // ── Comet tail for each hand's wrist path ─────────────────────────────────
  const getTail = (coords, currentTs) => {
    // Grab the last `tailLength` points up to currentTs from this hand's coords
    const upTo = coords.filter(p => p.timestamp <= currentPoint.timestamp);
    return upTo.slice(-tailLength);
  };
  const leftTail  = showBothHands && hasLeft  ? getTail(leftCoords,  currentPoint.timestamp) : [];
  const rightTail = showBothHands && hasRight ? getTail(rightCoords, currentPoint.timestamp) : [];

  // ── Arm to render at current frame ───────────────────────────────────────
  // For each hand, find the most recent point at or before currentPoint.timestamp
  const getArmAtTime = (handCoords, ts) => {
    let best = null;
    for (const p of handCoords) {
      if (p.timestamp <= ts) best = p;
      else break;
    }
    return best;
  };
  const leftArm  = hasLeft  ? getArmAtTime(leftCoords,  currentPoint.timestamp) : null;
  const rightArm = hasRight ? getArmAtTime(rightCoords, currentPoint.timestamp) : null;

  // Helper: draw one arm (shoulder→elbow→wrist)
  const renderArm = (armPoint, colors, opacity = 1) => {
    if (!armPoint) return null;
    const wrist    = { x: armPoint.x * 100, y: armPoint.y * 100 };
    const shoulder = armPoint.shoulder ? { x: armPoint.shoulder.x * 100, y: armPoint.shoulder.y * 100 } : null;
    const elbow    = armPoint.elbow    ? { x: armPoint.elbow.x    * 100, y: armPoint.elbow.y    * 100 } : null;

    return (
      <g opacity={opacity} key={colors.label}>
        {/* Upper arm: shoulder → elbow */}
        {shoulder && elbow && (
          <line
            x1={shoulder.x} y1={shoulder.y}
            x2={elbow.x}    y2={elbow.y}
            stroke="#94a3b8" strokeWidth="6" strokeLinecap="round"
          />
        )}
        {/* Forearm: elbow → wrist */}
        {elbow && (
          <line
            x1={elbow.x} y1={elbow.y}
            x2={wrist.x} y2={wrist.y}
            stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round"
          />
        )}
        {/* Shoulder joint */}
        {shoulder && (
          <circle cx={shoulder.x} cy={shoulder.y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
        )}
        {/* Elbow joint */}
        {elbow && (
          <circle cx={elbow.x} cy={elbow.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
        )}
        {/* Wrist/hand */}
        <circle cx={wrist.x} cy={wrist.y} r="6" fill={colors.fill} stroke="#fff" strokeWidth="1.5" />
        <circle cx={wrist.x} cy={wrist.y} r="11" fill={colors.fill} fillOpacity="0.25" className="animate-pulse" />
      </g>
    );
  };

  // ── Biomechanical values for the current point ────────────────────────────
  const bm = currentPoint;
  const ea = bm.elbowAngle    === -1 ? null : bm.elbowAngle;
  const sa = bm.shoulderAngle === -1 ? null : bm.shoulderAngle;
  const va = bm.verticalAngle === -1 ? null : bm.verticalAngle;

  // Progress %
  const progress = validCoords.length > 1 ? (safeIdx / (validCoords.length - 1)) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-150 dark:border-gray-700 mt-4 shadow-sm transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400">
            Arm Kinematics &amp; Replay
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Full skeleton animation — shoulder, elbow, and wrist move together per recorded frame.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasLeft && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Left Hand
            </span>
          )}
          {hasRight && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Right Hand
            </span>
          )}
          <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full">
            {validCoords.length} frames
          </span>
          {hasBoth && (
            <button
              onClick={() => setShowBothHands(v => !v)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${showBothHands ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              {showBothHands ? "Both Hands" : "Active Hand"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── SVG canvas ── */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />

            <svg viewBox={viewBoxStr} className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="xMidYMid meet">
              {/* ── Left hand wrist tail ── */}
              {leftTail.length > 1 && (
                <polyline
                  points={leftTail.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="none"
                  stroke={HAND_COLORS.Left.stroke}
                  strokeOpacity="0.55"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Left elbow comet tail */}
              {leftTail.length > 1 && leftTail.some(p => p.elbow) && (
                <polyline
                  points={leftTail.filter(p => p.elbow).map(p => `${p.elbow.x * 100},${p.elbow.y * 100}`).join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeOpacity="0.2"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* ── Right hand wrist tail ── */}
              {rightTail.length > 1 && (
                <polyline
                  points={rightTail.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="none"
                  stroke={HAND_COLORS.Right.stroke}
                  strokeOpacity="0.55"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Right elbow comet tail */}
              {rightTail.length > 1 && rightTail.some(p => p.elbow) && (
                <polyline
                  points={rightTail.filter(p => p.elbow).map(p => `${p.elbow.x * 100},${p.elbow.y * 100}`).join(" ")}
                  fill="none"
                  stroke="#3b82f6"
                  strokeOpacity="0.2"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              {/* ── Draw arms at current timestamp ── */}
              {/* Render inactive arm dimmed */}
              {showBothHands && hasLeft  && currentHand !== "Left"  && renderArm(leftArm,  HAND_COLORS.Left,  0.35)}
              {showBothHands && hasRight && currentHand !== "Right" && renderArm(rightArm, HAND_COLORS.Right, 0.35)}
              {/* Render active hand arm full opacity on top */}
              {hasLeft  && currentHand === "Left"  && renderArm(leftArm,  HAND_COLORS.Left,  1)}
              {hasRight && currentHand === "Right" && renderArm(rightArm, HAND_COLORS.Right, 1)}
              {/* Fallback: if no hand label, show current point's arm */}
              {!hasLeft && !hasRight && renderArm(currentPoint, HAND_COLORS.Unknown, 1)}
            </svg>

            {/* Legend */}
            <div className="absolute top-3 left-3 flex gap-2 text-[10px] bg-black/75 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-bold backdrop-blur-sm shadow-md z-20 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Shoulder</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Elbow</span>
              {hasLeft  && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Left</span>}
              {hasRight && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Right</span>}
            </div>

            {/* Frame counter */}
            <div className="absolute top-3 right-3 text-[10px] bg-black/75 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-bold backdrop-blur-sm shadow-md z-20">
              {safeIdx + 1} / {validCoords.length}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col gap-3">
            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-xl flex items-center justify-center text-white transition-all transform active:scale-95 ${isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-orange-500 hover:bg-orange-600"}`}
              >
                {isPlaying
                  ? <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                }
              </button>
              {/* Reset */}
              <button
                type="button"
                onClick={() => { setIsPlaying(false); setCurrentIdx(0); }}
                className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>
              {/* Scrubber */}
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={validCoords.length - 1}
                  value={safeIdx}
                  onChange={e => { setIsPlaying(false); setCurrentIdx(parseInt(e.target.value)); }}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              {/* Speed */}
              <select
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none cursor-pointer"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="2">2.0x</option>
                <option value="4">4.0x</option>
              </select>
              {/* Loop */}
              <button
                type="button"
                onClick={() => setIsLooping(v => !v)}
                title="Toggle loop"
                className={`p-2.5 rounded-xl transition-all text-xs font-bold ${isLooping ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
              >
                ↺
              </button>
            </div>
            {/* Tail length control */}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium whitespace-nowrap">Trail length: {tailLength}</span>
              <input
                type="range" min="5" max="80" step="5"
                value={tailLength}
                onChange={e => setTailLength(parseInt(e.target.value))}
                className="flex-1 accent-orange-400"
              />
            </div>
          </div>
        </div>

        {/* ── Biomechanical panel ── */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-5 border dark:border-slate-800 flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Biomechanical Data</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Active: <span className="font-bold" style={{ color: handColor.stroke }}>{handColor.label}</span>
            </p>
          </div>

          <div className="space-y-4">
            {/* Elbow Extension */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Elbow Angle</span>
                <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                  {ea !== null && ea !== undefined ? `${Math.round(ea)}°` : "N/A"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${ea !== null && ea !== undefined ? Math.min(100, (ea / 180) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Shoulder Abduction */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Shoulder Abduction</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {sa !== null && sa !== undefined ? `${Math.round(sa)}°` : "N/A"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${sa !== null && sa !== undefined ? Math.min(100, (sa / 180) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Vertical Angle (arm elevation) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Arm Elevation</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {va !== null && va !== undefined ? `${Math.round(va)}°` : "N/A"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-100"
                  style={{ width: `${va !== null && va !== undefined ? Math.min(100, (va / 90) * 100) : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Upper arm vs vertical (0° = arm down)</p>
            </div>
          </div>

          {/* Position readout */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joint Positions</h5>
            {currentPoint.shoulder && (
              <div className="flex justify-between text-xs">
                <span className="text-red-500 font-bold">● Shoulder</span>
                <span className="text-gray-600 dark:text-gray-400 font-mono">
                  ({currentPoint.shoulder.x.toFixed(2)}, {currentPoint.shoulder.y.toFixed(2)})
                </span>
              </div>
            )}
            {currentPoint.elbow && (
              <div className="flex justify-between text-xs">
                <span className="text-blue-500 font-bold">● Elbow</span>
                <span className="text-gray-600 dark:text-gray-400 font-mono">
                  ({currentPoint.elbow.x.toFixed(2)}, {currentPoint.elbow.y.toFixed(2)})
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="font-bold" style={{ color: handColor.stroke }}>● {handColor.label}</span>
              <span className="text-gray-600 dark:text-gray-400 font-mono">
                ({currentPoint.x.toFixed(2)}, {currentPoint.y.toFixed(2)})
              </span>
            </div>
            {currentPoint.timestamp !== undefined && (
              <div className="flex justify-between text-xs pt-1 border-t dark:border-slate-700">
                <span className="text-gray-400 font-bold">⏱ Time</span>
                <span className="text-gray-600 dark:text-gray-400 font-mono">{currentPoint.timestamp.toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArmReachVisualizer;
