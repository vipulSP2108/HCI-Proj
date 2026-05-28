const mongoose = require('mongoose');

const jointCoordinateSchema = new mongoose.Schema({
  x: Number,
  y: Number
}, { _id: false });

const coordinateSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  screenX: Number,
  screenY: Number,
  timestamp: Number,
  zone: String,
  color: String,
  // Joint positions
  leftShoulder: jointCoordinateSchema,
  rightShoulder: jointCoordinateSchema,
  leftElbow: jointCoordinateSchema,
  rightElbow: jointCoordinateSchema,
  leftWrist: jointCoordinateSchema,
  rightWrist: jointCoordinateSchema,
  palm: jointCoordinateSchema,
  // Per-side angles (Board Drawing - both sides tracked simultaneously)
  elbowAngleLeft: Number,     // interior angle at left elbow, -1 if invisible
  elbowAngleRight: Number,
  shoulderAngleLeft: Number,  // abduction: otherShoulder→shoulder vs shoulder→elbow, -1 if invisible
  shoulderAngleRight: Number,
  verticalAngleLeft: Number,  // upper arm vs vertical down, -1 if invisible
  verticalAngleRight: Number,
  // Single-hand fields (Fruit Basket / Piano)
  hand: String,
  elbowAngle: Number,
  shoulderAngle: Number,
  verticalAngle: Number,
  // Fruit Basket specific
  event: String,
  trialId: Number,
  success: Boolean,
  aratScore: Number
}, { _id: false });

const boardDrawingAttemptSchema = new mongoose.Schema({
  attemptNumber: { type: Number },
  requestedShape: { type: String },
  shapeType: { type: String },
  hand: { type: String },
  startedAt: { type: Number },
  endedAt: { type: Number },
  canvasWidth: { type: Number },
  canvasHeight: { type: Number },
  targetPath: [coordinateSchema],
  drawnPath: [coordinateSchema],  // includes per-point angles
  pathMatrix: [[Number]],
  hits: { type: Number },
  total: { type: Number },
  completion: { type: Number },
  success: { type: Boolean },
  scoreAfter: { type: Number },
  traceQuality: { type: Number },
  pointsEarned: { type: Number },
  safeZoneRadius: { type: Number },
  warningZoneRadius: { type: Number }
}, { _id: false });

const playEntrySchema = new mongoose.Schema({
  responsetime: { type: Number },
  correct: { type: Number },
  score: { type: Number },
  accuracy: { type: Number },
  attempts: { type: Number },
  successes: { type: Number },
  eventName: { type: String },
  shapeType: { type: String },
  hand: { type: String },
  trialId: { type: Number },
  elbowAngle: { type: Number },
  shoulderAngle: { type: Number },
  verticalAngle: { type: Number },
  fruitId: { type: String },
  sourceIdx: { type: Number },
  basketIdx: { type: Number },
  trialDurationSec: { type: Number },
  success: { type: Boolean },
  aratScore: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const systemMetricsSchema = new mongoose.Schema({
  avgFps: { type: Number },
  avgLatency: { type: Number },
  userAgent: { type: String },
  resolution: { type: String }
}, { _id: false });

const gameSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameType: { type: String, required: true, index: true },
  gameName: { type: String, required: true },
  time: { type: Date, default: Date.now, required: true },
  levelspan: { type: Number }, // Mainly used for Piano Game
  sessionScore: { type: Number },
  
  // Developer / System Metrics
  systemMetrics: systemMetricsSchema,

  // Interaction / Movement data (e.g. for Board Drawing, Fruit Fetch)
  coordinates: [coordinateSchema],
  boardDrawingAttempts: [boardDrawingAttemptSchema],
  play: [playEntrySchema]

}, { timestamps: true });

module.exports = mongoose.model('GameSession', gameSessionSchema);
