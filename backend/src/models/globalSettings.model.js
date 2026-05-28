const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
  testingMode: {
    type: Boolean,
    default: true
  },
  pianoSessionSeconds: {
    type: Number,
    default: 300
  },
  boardDrawingSessionSeconds: {
    type: Number,
    default: 300
  },
  fruitBasketSessionSeconds: {
    type: Number,
    default: 300
  },
  shapeTracingSessionSeconds: {
    type: Number,
    default: 300
  },
  inCamGameSessionSeconds: {
    type: Number,
    default: 300
  },
  testingPianoDisabledKeys: {
    type: [String],
    default: []
  },
  testingPianoKeyTimer: {
    type: Number,
    default: 5
  },
  testingPianoSequence: {
    type: [Number],
    default: Array.from({ length: 400 }, (_, i) => Math.floor(Math.abs(Math.sin(i * 12.9898 + 78.233)) * 9))
  },
  testingPianoMobileSequence: {
    type: [Number],
    default: Array.from({ length: 400 }, (_, i) => Math.floor(Math.abs(Math.sin(i * 12.9898 + 78.233)) * 4))
  },
  testingShapeSequence: {
    type: [String],
    default: ['circle', 'triangle', 'square', 'spiral', 'star']
  },
  testingShapeTimer: {
    type: Number,
    default: 120
  },
  testingShapeSessionSeconds: {
    type: Number,
    default: 600
  },
  testingPianoWristKeysCount: {
    type: Number,
    default: 4
  },
  testingPianoWristTimer: {
    type: Number,
    default: 5
  },
  testingPianoWristSequence: {
    type: [Number],
    default: Array.from({ length: 400 }, (_, i) => Math.floor(Math.abs(Math.sin(i * 12.9898 + 78.233)) * 9))
  },
  testingFruitBasketSequence: {
    type: [{
      sourceIdx: Number,
      basketIdx: Number
    }],
    default: [
      { sourceIdx: 0, basketIdx: 8 },
      { sourceIdx: 2, basketIdx: 6 },
      { sourceIdx: 4, basketIdx: 0 },
      { sourceIdx: 8, basketIdx: 2 },
      { sourceIdx: 6, basketIdx: 4 },
      { sourceIdx: 1, basketIdx: 7 },
      { sourceIdx: 3, basketIdx: 5 },
      { sourceIdx: 5, basketIdx: 3 },
      { sourceIdx: 7, basketIdx: 1 },
      { sourceIdx: 0, basketIdx: 5 },
      { sourceIdx: 8, basketIdx: 3 },
      { sourceIdx: 2, basketIdx: 7 },
      { sourceIdx: 6, basketIdx: 1 },
      { sourceIdx: 4, basketIdx: 8 },
      { sourceIdx: 1, basketIdx: 6 },
      { sourceIdx: 7, basketIdx: 2 },
      { sourceIdx: 3, basketIdx: 8 },
      { sourceIdx: 5, basketIdx: 0 },
      { sourceIdx: 0, basketIdx: 7 },
      { sourceIdx: 8, basketIdx: 1 },
      { sourceIdx: 2, basketIdx: 5 },
      { sourceIdx: 6, basketIdx: 3 },
      { sourceIdx: 4, basketIdx: 6 },
      { sourceIdx: 1, basketIdx: 8 },
      { sourceIdx: 7, basketIdx: 0 },
      { sourceIdx: 3, basketIdx: 6 },
      { sourceIdx: 5, basketIdx: 2 },
      { sourceIdx: 0, basketIdx: 6 },
      { sourceIdx: 8, basketIdx: 0 },
      { sourceIdx: 2, basketIdx: 8 },
      { sourceIdx: 6, basketIdx: 2 },
      { sourceIdx: 4, basketIdx: 7 },
      { sourceIdx: 1, basketIdx: 5 },
      { sourceIdx: 7, basketIdx: 3 },
      { sourceIdx: 3, basketIdx: 7 },
      { sourceIdx: 5, basketIdx: 1 },
      { sourceIdx: 0, basketIdx: 3 },
      { sourceIdx: 8, basketIdx: 5 },
      { sourceIdx: 2, basketIdx: 4 },
      { sourceIdx: 6, basketIdx: 8 }
    ]
  },
  boardDrawingAssistiveMode: {
    type: Boolean,
    default: true
  },
  fruitBasketCoordSampleMs: {
    type: Number,
    default: 150
  },
  boardDrawingCoordSampleMs: {
    type: Number,
    default: 150
  }
}, { timestamps: true });

// We only need one document for global settings
globalSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  const defaultSeq = [
    { sourceIdx: 0, basketIdx: 8 },
    { sourceIdx: 2, basketIdx: 6 },
    { sourceIdx: 4, basketIdx: 0 },
    { sourceIdx: 8, basketIdx: 2 },
    { sourceIdx: 6, basketIdx: 4 },
    { sourceIdx: 1, basketIdx: 7 },
    { sourceIdx: 3, basketIdx: 5 },
    { sourceIdx: 5, basketIdx: 3 },
    { sourceIdx: 7, basketIdx: 1 },
    { sourceIdx: 0, basketIdx: 5 },
    { sourceIdx: 8, basketIdx: 3 },
    { sourceIdx: 2, basketIdx: 7 },
    { sourceIdx: 6, basketIdx: 1 },
    { sourceIdx: 4, basketIdx: 8 },
    { sourceIdx: 1, basketIdx: 6 },
    { sourceIdx: 7, basketIdx: 2 },
    { sourceIdx: 3, basketIdx: 8 },
    { sourceIdx: 5, basketIdx: 0 },
    { sourceIdx: 0, basketIdx: 7 },
    { sourceIdx: 8, basketIdx: 1 },
    { sourceIdx: 2, basketIdx: 5 },
    { sourceIdx: 6, basketIdx: 3 },
    { sourceIdx: 4, basketIdx: 6 },
    { sourceIdx: 1, basketIdx: 8 },
    { sourceIdx: 7, basketIdx: 0 },
    { sourceIdx: 3, basketIdx: 6 },
    { sourceIdx: 5, basketIdx: 2 },
    { sourceIdx: 0, basketIdx: 6 },
    { sourceIdx: 8, basketIdx: 0 },
    { sourceIdx: 2, basketIdx: 8 },
    { sourceIdx: 6, basketIdx: 2 },
    { sourceIdx: 4, basketIdx: 7 },
    { sourceIdx: 1, basketIdx: 5 },
    { sourceIdx: 7, basketIdx: 3 },
    { sourceIdx: 3, basketIdx: 7 },
    { sourceIdx: 5, basketIdx: 1 },
    { sourceIdx: 0, basketIdx: 3 },
    { sourceIdx: 8, basketIdx: 5 },
    { sourceIdx: 2, basketIdx: 4 },
    { sourceIdx: 6, basketIdx: 8 }
  ];
  if (!settings) {
    settings = await this.create({
      testingFruitBasketSequence: defaultSeq
    });
  } else if (!settings.testingFruitBasketSequence || settings.testingFruitBasketSequence.length <= 9) {
    settings.testingFruitBasketSequence = defaultSeq;
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
