import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * ArmReachVisualizer — Full kinematic replay for Fruit Fetch sessions.
 *
 * Each coordinate point in the log belongs to ONE hand and carries that hand's
 * full kinematic snapshot at that moment:
 *   x, y          — normalised wrist position (0–1)
 *   hand          — "Left" | "Right"
 *   shoulder      — { x, y }  (normalised, may be null)
 *   elbow         — { x, y }  (normalised, may be null)
 *   elbowAngle    — degrees, -1 if invisible
 *   shoulderAngle — degrees, -1 if invisible
 *   verticalAngle — degrees, -1 if invisible
 *   timestamp     — seconds since session start
 *
 * Strategy: step through validCoords index-by-index (exactly like BoardDrawingTrajectoryReplay).
 * Each frame = one recorded point. The active hand skeleton updates from that point's own data.
 * The inactive hand shows its most-recently-recorded state so it doesn't vanish.
 * Comet trails are the last `tailLength` points PER HAND up to the current index.
 */

const HAND_COLORS = {
  Left:    { stroke: "#6366f1", fill: "#6366f1", label: "Left Hand"  },
  Right:   { stroke: "#10b981", fill: "#10b981", label: "Right Hand" },
  Unknown: { stroke: "#f59e0b", fill: "#f59e0b", label: "Hand"       },
};

const ArmReachVisualizer = ({ coordinates }) => {
  const [isPlaying, setIsPlaying]         = useState(false);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping]         = useState(false);
  const [showBothHands, setShowBothHands] = useState(true);
  const [tailLength, setTailLength]       = useState(30);
  const timerRef = useRef(null);

  // ── Clean coordinate array (chronological order, both hands interleaved) ──
  const validCoords = useMemo(() =>
    Array.isArray(coordinates)
      ? [...coordinates]
          .filter(p => p && typeof p.x === "number" && typeof p.y === "number")
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      : [],
    [coordinates]
  );

  // Per-hand index maps: leftCoords[i] = all Left points in order; same for right
  const leftCoords  = useMemo(() => validCoords.filter(p => p.hand === "Left"),  [validCoords]);
  const rightCoords = useMemo(() => validCoords.filter(p => p.hand === "Right"), [validCoords]);
  const hasLeft  = leftCoords.length > 0;
  const hasRight = rightCoords.length > 0;
  const hasBoth  = hasLeft && hasRight;

  // Average ms per frame across the whole recording.
  // We cannot use consecutive-frame deltas because Left/Right samples are interleaved
  // with nearly identical timestamps, making consecutive deltas collapse to ~0ms.
  // Instead, divide total session duration by (N-1) frames, clamp to [16ms, 250ms].
  const avgIntervalMs = useMemo(() => {
    if (validCoords.length < 2) return 80;
    const totalSec = (validCoords[validCoords.length - 1].timestamp ?? 0) - (validCoords[0].timestamp ?? 0);
    if (totalSec <= 0) return 80;
    return Math.max(16, Math.min(250, (totalSec * 1000) / (validCoords.length - 1)));
  }, [validCoords]);

  // Reset when data changes
  useEffect(() => { setCurrentIdx(0); setIsPlaying(false); }, [coordinates]);

  // ── Playback: setInterval at avgIntervalMs / playbackSpeed ─────────────────
  useEffect(() => {
    if (!isPlaying || validCoords.length < 2) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const ms = Math.max(8, avgIntervalMs / playbackSpeed);
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        const next = prev + 1;
        if (next >= validCoords.length) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, avgIntervalMs, playbackSpeed, isLooping, validCoords.length]);

  // ── Memoised viewBox ────────────────────────────────────────────────────────
  const viewBoxStr = useMemo(() => {
    if (validCoords.length === 0) return "0 0 100 100";
    const xs = [];
    const ys = [];
    validCoords.forEach(p => {
      xs.push(p.x); ys.push(p.y);
      if (p.shoulder) { xs.push(p.shoulder.x); ys.push(p.shoulder.y); }
      if (p.elbow)    { xs.push(p.elbow.x);    ys.push(p.elbow.y);    }
    });
    const minX = Math.min(...xs, 0.1);
    const maxX = Math.max(...xs, 0.9);
    const minY = Math.min(...ys, 0.1);
    const maxY = Math.max(...ys, 0.95);
    const px = Math.max((maxX - minX) * 0.12, 0.08);
    const py = Math.max((maxY - minY) * 0.12, 0.08);
    return `${(minX - px) * 100} ${(minY - py) * 100} ${(maxX - minX + 2 * px) * 100} ${(maxY - minY + 2 * py) * 100}`;
  }, [validCoords]);

  // ── Early return AFTER all hooks ────────────────────────────────────────────
  if (validCoords.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 text-center mt-6 shadow-sm">
        <div className="mb-3 text-5xl">💪</div>
        <p className="font-bold text-gray-800 dark:text-gray-200 mb-1 text-lg">No Arm Movement Data Yet</p>
        <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          Arm trajectory is recorded automatically during gameplay. Play a session to see your kinematic arm reach visualization.
        </p>
      </div>
    );
  }

  // ── Current frame ───────────────────────────────────────────────────────────
  const safeIdx      = Math.min(currentIdx, validCoords.length - 1);
  const currentPoint = validCoords[safeIdx];
  const currentHand  = currentPoint?.hand || "Unknown";
  const handColor    = HAND_COLORS[currentHand] || HAND_COLORS.Unknown;

  // For the INACTIVE hand, find its most recent snapshot up to safeIdx so it
  // doesn't disappear — its joints should reflect its last known position.
  const getLatestSnapshotBefore = (handCoords, upToIdx) => {
    // validCoords is sorted; we need the last point of `hand` with index <= upToIdx
    let best = null;
    for (let i = 0; i <= upToIdx; i++) {
      if (validCoords[i].hand === (handCoords[0]?.hand)) best = validCoords[i];
    }
    return best;
  };

  // Active hand: the current point itself
  // Inactive hand: most recent snapshot for that hand up to now
  const leftArmPoint  = hasLeft  ? (currentHand === "Left"  ? currentPoint : getLatestSnapshotBefore(leftCoords,  safeIdx)) : null;
  const rightArmPoint = hasRight ? (currentHand === "Right" ? currentPoint : getLatestSnapshotBefore(rightCoords, safeIdx)) : null;

  // ── Comet trails — last `tailLength` points PER hand up to safeIdx ──────────
  const getHandTrail = (hand, tailLen) => {
    const trail = [];
    for (let i = safeIdx; i >= 0 && trail.length < tailLen; i--) {
      if (validCoords[i].hand === hand) trail.unshift(validCoords[i]);
    }
    return trail;
  };
  const leftTrail  = showBothHands && hasLeft  ? getHandTrail("Left",  tailLength) : [];
  const rightTrail = showBothHands && hasRight ? getHandTrail("Right", tailLength) : [];

  // ── Render one arm skeleton (shoulder→elbow→wrist) ──────────────────────────
  const renderArm = (point, colors) => {
    if (!point) return null;
    const w  = { x: point.x * 100,           y: point.y * 100 };
    const sh = point.shoulder ? { x: point.shoulder.x * 100, y: point.shoulder.y * 100 } : null;
    const el = point.elbow    ? { x: point.elbow.x    * 100, y: point.elbow.y    * 100 } : null;
    const isActive = point.hand === currentHand;
    return (
      <g key={colors.label} opacity={isActive ? 1 : 0.55}>
        {/* Upper arm */}
        {sh && el && <line x1={sh.x} y1={sh.y} x2={el.x} y2={el.y} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />}
        {/* Forearm */}
        {el && <line x1={el.x} y1={el.y} x2={w.x} y2={w.y} stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />}
        {/* Joints */}
        {sh && <circle cx={sh.x} cy={sh.y} r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />}
        {el && <circle cx={el.x} cy={el.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />}
        {/* Wrist */}
        <circle cx={w.x} cy={w.y} r="6" fill={colors.fill} stroke="#fff" strokeWidth="1.5" />
        <circle cx={w.x} cy={w.y} r="11" fill={colors.fill} fillOpacity="0.22" />
      </g>
    );
  };

  // Biomechanical readout from the current point
  const ea = currentPoint?.elbowAngle    === -1 ? null : currentPoint?.elbowAngle;
  const sa = currentPoint?.shoulderAngle === -1 ? null : currentPoint?.shoulderAngle;
  const va = currentPoint?.verticalAngle === -1 ? null : currentPoint?.verticalAngle;

  const progress = validCoords.length > 1 ? (safeIdx / (validCoords.length - 1)) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 mt-4 shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400">
            Arm Kinematics &amp; Replay
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Frame-by-frame skeleton replay — each point is one recorded sample; shoulder, elbow and wrist update every frame.
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
              {showBothHands ? "Both Hands" : "Active Only"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── SVG Canvas ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            {/* Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />

            <svg viewBox={viewBoxStr} className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="xMidYMid meet">
              {/* ── Comet tail: Left wrist trail ── */}
              {leftTrail.length > 1 && (
                <polyline
                  points={leftTrail.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="none" stroke={HAND_COLORS.Left.stroke}
                  strokeOpacity="0.75" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {/* ── Comet tail: Left elbow trail ── */}
              {leftTrail.length > 1 && leftTrail.some(p => p.elbow) && (
                <polyline
                  points={leftTrail.filter(p => p.elbow).map(p => `${p.elbow.x * 100},${p.elbow.y * 100}`).join(" ")}
                  fill="none" stroke="#3b82f6"
                  strokeOpacity="0.3" strokeWidth="2" strokeDasharray="3 4"
                />
              )}

              {/* ── Comet tail: Right wrist trail ── */}
              {rightTrail.length > 1 && (
                <polyline
                  points={rightTrail.map(p => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="none" stroke={HAND_COLORS.Right.stroke}
                  strokeOpacity="0.75" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {/* ── Comet tail: Right elbow trail ── */}
              {rightTrail.length > 1 && rightTrail.some(p => p.elbow) && (
                <polyline
                  points={rightTrail.filter(p => p.elbow).map(p => `${p.elbow.x * 100},${p.elbow.y * 100}`).join(" ")}
                  fill="none" stroke="#3b82f6"
                  strokeOpacity="0.3" strokeWidth="2" strokeDasharray="3 4"
                />
              )}

              {/* ── Skeleton arms ── */}
              {showBothHands ? (
                <>
                  {hasLeft  && renderArm(leftArmPoint,  HAND_COLORS.Left)}
                  {hasRight && renderArm(rightArmPoint, HAND_COLORS.Right)}
                </>
              ) : (
                <>
                  {currentHand === "Left"  && renderArm(leftArmPoint,  HAND_COLORS.Left)}
                  {currentHand === "Right" && renderArm(rightArmPoint, HAND_COLORS.Right)}
                  {currentHand === "Unknown" && renderArm(currentPoint, HAND_COLORS.Unknown)}
                </>
              )}
            </svg>

            {/* Legend */}
            <div className="absolute top-3 left-3 flex gap-2 text-[10px] bg-black/70 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-bold backdrop-blur-sm z-20 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Shoulder</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Elbow</span>
              {hasLeft  && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Left</span>}
              {hasRight && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Right</span>}
            </div>

            {/* Frame counter */}
            <div className="absolute top-3 right-3 text-[10px] bg-black/70 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-bold backdrop-blur-sm z-20">
              Frame {safeIdx + 1} / {validCoords.length} · <span style={{ color: handColor.fill }}>{handColor.label}</span>
            </div>
          </div>

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-3">
            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress}%`, transition: "width 0.05s linear" }} />
            </div>
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={() => setIsPlaying(p => !p)}
                className={`p-2.5 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 ${isPlaying ? "bg-amber-500 hover:bg-amber-600" : "bg-orange-500 hover:bg-orange-600"}`}
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
                className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
              >
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>
              {/* Scrubber */}
              <div className="flex-1">
                <input
                  type="range" min="0" max={validCoords.length - 1} value={safeIdx}
                  onChange={e => { setIsPlaying(false); setCurrentIdx(parseInt(e.target.value)); }}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              {/* Speed */}
              <select
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none cursor-pointer dark:text-white"
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
            {/* Trail length */}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium whitespace-nowrap">Trail length: {tailLength}</span>
              <input
                type="range" min="5" max="100" step="5" value={tailLength}
                onChange={e => setTailLength(parseInt(e.target.value))}
                className="flex-1 accent-orange-400"
              />
            </div>
          </div>
        </div>

        {/* ── Biomechanical panel ──────────────────────────────────────────── */}
        <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-5 border dark:border-slate-800 flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Biomechanical Data</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Active: <span className="font-bold" style={{ color: handColor.fill }}>{handColor.label}</span>
            </p>
          </div>

          <div className="space-y-4">
            {/* Elbow */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Elbow Angle</span>
                <span className="text-lg font-black text-orange-600 dark:text-orange-400">{ea != null ? `${Math.round(ea)}°` : "N/A"}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-75" style={{ width: `${ea != null ? Math.min(100, (ea / 180) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Shoulder */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Shoulder Abduction</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{sa != null ? `${Math.round(sa)}°` : "N/A"}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-75" style={{ width: `${sa != null ? Math.min(100, (sa / 180) * 100) : 0}%` }} />
              </div>
            </div>

            {/* Arm Elevation */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Arm Elevation</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{va != null ? `${Math.round(va)}°` : "N/A"}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-75" style={{ width: `${va != null ? Math.min(100, (va / 90) * 100) : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Upper arm vs vertical (0° = arm down)</p>
            </div>
          </div>

          {/* Joint Positions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joint Positions</h5>
            {currentPoint?.shoulder && (
              <div className="flex justify-between text-xs">
                <span className="text-red-500 font-bold">● Shoulder</span>
                <span className="text-gray-600 dark:text-gray-400 font-mono">
                  ({currentPoint.shoulder.x.toFixed(3)}, {currentPoint.shoulder.y.toFixed(3)})
                </span>
              </div>
            )}
            {currentPoint?.elbow && (
              <div className="flex justify-between text-xs">
                <span className="text-blue-500 font-bold">● Elbow</span>
                <span className="text-gray-600 dark:text-gray-400 font-mono">
                  ({currentPoint.elbow.x.toFixed(3)}, {currentPoint.elbow.y.toFixed(3)})
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="font-bold" style={{ color: handColor.fill }}>● {handColor.label}</span>
              <span className="text-gray-600 dark:text-gray-400 font-mono">
                ({currentPoint?.x.toFixed(3)}, {currentPoint?.y.toFixed(3)})
              </span>
            </div>
            {currentPoint?.timestamp != null && (
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
