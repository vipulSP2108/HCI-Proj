const mongoose = require('mongoose');

const jointCoordinateSchema = new mongoose.Schema({
  x: Number,
  y: Number
}, { _id: false });

// Session-level coordinate trajectory point (continuous sampling)
const coordinateSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  timestamp: Number,
  hand: String,              // which hand this sample belongs to
  shoulder: jointCoordinateSchema,
  elbow: jointCoordinateSchema,
  elbowAngle: Number,        // interior angle at elbow (wrist→elbow←shoulder), -1 if invisible
  shoulderAngle: Number,     // shoulder abduction: otherShoulder→shoulder vs shoulder→elbow, -1 if invisible
  verticalAngle: Number,     // upper arm vs vertical down, -1 if invisible
}, { _id: false });

// Per-trial trajectory point
const trialTrajectoryPointSchema = new mongoose.Schema({
  timestamp: Number,
  x: Number, y: Number,
  hand: String,
  shoulder: jointCoordinateSchema,
  elbow: jointCoordinateSchema,
  elbowAngle: Number,
  shoulderAngle: Number,
  verticalAngle: Number,
}, { _id: false });

// Per-trial summary (one entry per fruit pick-and-drop attempt)
const trialSchema = new mongoose.Schema({
  trialId: Number,
  fruitId: String,
  sourceIdx: Number,
  basketIdx: Number,
  hand: String,
  startTimestamp: Number,
  endTimestamp: Number,
  outcome: { type: String, enum: ['success', 'miss', 'timeout'] },
  trajectory: [trialTrajectoryPointSchema]
}, { _id: false });

// Lean play entry — only fields that change per event
const playEntrySchema = new mongoose.Schema({
  eventName: { type: String },      // spawn, pick, drop_success, drop_miss, timeout, session_start/end
  trialId: { type: Number },
  hand: { type: String },           // which hand performed the action
  responsetime: { type: Number },   // trial duration for pick/drop, -1 for timeout
  correct: { type: Number },        // 1=success, -1=miss, 0=timeout, undefined for meta events
  score: { type: Number },
  elbowAngle: { type: Number },
  shoulderAngle: { type: Number },
  verticalAngle: { type: Number },
  fruitId: { type: String },
  sourceIdx: { type: Number },
  basketIdx: { type: Number },
  trialDurationSec: { type: Number },
  success: { type: Boolean },
  aratScore: { type: Number },
}, { _id: false });

// Session-level static metadata (stored once, not repeated per play entry)
const sessionMetaSchema = new mongoose.Schema({
  mode: { type: String },               // "NORMAL" | "ASSISTIVE"
  handFunctionLeft: { type: String },   // "limited" | "normal"
  handFunctionRight: { type: String },
}, { _id: false });

const systemMetricsSchema = new mongoose.Schema({
  avgFps: { type: Number },
  avgLatency: { type: Number },
  userAgent: { type: String },
  resolution: { type: String }
}, { _id: false });

const fruitBasketSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameType: { type: String, required: true, default: 'fruit_basket', index: true },
  gameName: { type: String, required: true, default: 'Fruit Basket' },
  time: { type: Date, default: Date.now, required: true },
  sessionScore: { type: Number },

  sessionMeta: sessionMetaSchema,    // static fields moved here
  systemMetrics: systemMetricsSchema,

  coordinates: [coordinateSchema],   // continuous session-level trajectory
  trials: [trialSchema],             // per-trial trajectory + outcome
  play: [playEntrySchema],           // lean event log
}, { timestamps: true });

module.exports = mongoose.model('FruitBasketSession', fruitBasketSessionSchema);
