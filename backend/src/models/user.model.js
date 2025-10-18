const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Play entry schema (each A/S attempt)
const playEntrySchema = new mongoose.Schema({
  responsetime: {
    type: Number, // 0 to levelspan (in seconds), -1 if exceeded
    required: true
  },
  correct: {
    type: Number, // 1 = correct, -1 = incorrect, 0 = not done (exceeded levelspan)
    required: true,
    enum: [-1, 0, 1]
  }
}, { _id: false });

// Game session schema (each time user plays)
const gameSessionSchema = new mongoose.Schema({
  time: {
    type: Date,
    default: Date.now,
    required: true
  },
  levelspan: {
    type: Number, // How much time user gets to select (in seconds)
    required: true
  },
  play: [playEntrySchema]
}, { _id: false });

// Game type schema
const gameTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'type1'
  },
  name: {
    type: String,
    default: 'Reaction Game'
  },
  eachGameStats: [gameSessionSchema]
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['doctor', 'patient', 'caretaker'],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  currentlevelspan: {
    type: Number,
    default: 5 // Default 5 seconds
  },
  game: [gameTypeSchema],
  level: {
    type: Number,
    default: 1
  },
  totalScore: {
    type: Number,
    default: 0
  },
  resetOTP: {
    type: String,
    default: null
  },
  resetOTPExpiry: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.calculateLevel = function() {
  return Math.floor(this.totalScore / 100) + 1;
};

module.exports = mongoose.model('User', userSchema);
