const mongoose = require('mongoose');

const parameterConfigSchema = new mongoose.Schema({
  modality: { 
    type: String, 
    enum: ['STRICT', 'CARETAKER', 'DYNAMIC'], 
    default: 'STRICT' 
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  minBound: { type: Number, default: null },
  maxBound: { type: Number, default: null }
}, { _id: false });

const patientGameConfigSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  games: {
    piano: {
      responseTimer: { type: parameterConfigSchema, default: () => ({ value: 3.0 }) }, // Time to hit the key
      disabledKeys: { type: parameterConfigSchema, default: () => ({ value: "" }) }, // Comma separated keys
      wristKeysCount: { type: parameterConfigSchema, default: () => ({ value: 9 }) }, // Number of keys in wrist mode (2-9)
      wristKeyTimer: { type: parameterConfigSchema, default: () => ({ value: 2.0 }) }, // Time to hit key in wrist mode
      sessionLength: { type: parameterConfigSchema, default: () => ({ value: 300 }) } // seconds
    },
    boardDrawing: {
      assistiveMode: { type: parameterConfigSchema, default: () => ({ value: 0 }) }, // 1 for true, 0 for false. Strict only.
      greenZone: { type: parameterConfigSchema, default: () => ({ value: 2.5 }) }, // Safe score boundary
      yellowZone: { type: parameterConfigSchema, default: () => ({ value: 5.0 }) }, // Warning score boundary
      sessionLength: { type: parameterConfigSchema, default: () => ({ value: 300 }) },
      patientFreedom: { type: parameterConfigSchema, default: () => ({ value: "" }) }, // comma-separated fields
      allowedShapes: { type: parameterConfigSchema, default: () => ({ value: "random,circle,square,spiral,star" }) } // comma-separated shapes
    },
    fruitBasket: {
      cooldownSeconds: { type: parameterConfigSchema, default: () => ({ value: 3 }) }, // Cooldown between fruit spawns
      maxAttempts: { type: parameterConfigSchema, default: () => ({ value: 3 }) }, // Max attempts per trial
      trialTimeoutSeconds: { type: parameterConfigSchema, default: () => ({ value: 10 }) }, // Timeout per trial attempt
      sessionLength: { type: parameterConfigSchema, default: () => ({ value: 300 }) },
      assistiveMode: { type: parameterConfigSchema, default: () => ({ value: 2 }) }, // 0=ForceOff, 1=ForceOn, 2=Auto-calibrate
      patientFreedom: { type: parameterConfigSchema, default: () => ({ value: "" }) } // comma-separated fields
    },
  }
}, { timestamps: true });

module.exports = mongoose.model('PatientGameConfig', patientGameConfigSchema);
