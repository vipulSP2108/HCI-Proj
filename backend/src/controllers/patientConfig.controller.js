const PatientGameConfig = require('../models/patientGameConfig.model');
const GameSession = require('../models/gameSession.model'); // for dynamic logic

// Internal helper to clamp values
const clamp = (val, min, max) => {
  if (min !== null && val < min) return min;
  if (max !== null && val > max) return max;
  return val;
};

// @desc    Get patient game config
// @route   GET /api/patient-config/:patientId
// @access  Authenticated (Doctor, Caretaker, Patient)
const getConfig = async (req, res) => {
  try {
    const { patientId } = req.params;
    let config = await PatientGameConfig.findOne({ patientId });
    if (!config) {
      config = await PatientGameConfig.create({ patientId });
    }
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching patient config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update patient game config
// @route   PUT /api/patient-config/:patientId
// @access  Authenticated (Doctor, Caretaker)
const updateConfig = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { updates } = req.body; // e.g. { "games.piano.responseTimer.value": 2.5 }
    
    let config = await PatientGameConfig.findOne({ patientId });
    if (!config) {
      config = await PatientGameConfig.create({ patientId });
    }

    // Role-based validation
    const userRole = req.user.type; // Assuming req.user is set by auth middleware
    let warnings = [];

    for (const [path, newValue] of Object.entries(updates)) {
      // Split path: e.g. "games", "piano", "responseTimer", "value"
      const parts = path.split('.');
      if (parts.length >= 3) {
        const game = parts[1];
        const param = parts[2];
        const field = parts[3]; // e.g. "value", "modality", "minBound"

        if (userRole === 'doctor' || userRole === 'admin') {
          // Doctors can update anything safely via set
          config.set(path, newValue);
        } else if (userRole === 'caretaker') {
          const currentParam = config.games?.[game]?.[param];
          if (!currentParam) continue;
          
          // Caretakers can only update 'value' IF modality is CARETAKER
          if (field === 'value' && currentParam.modality === 'CARETAKER') {
            const clampedValue = clamp(newValue, currentParam.minBound, currentParam.maxBound);
            if (newValue !== clampedValue) {
              warnings.push(`Adjusted ${param} to ${clampedValue} (bounds: [${currentParam.minBound}, ${currentParam.maxBound}]).`);
            }
            config.set(path, clampedValue);
          } else {
            return res.status(403).json({ 
              success: false, 
              message: `Caretaker not authorized to modify ${field} for ${param}.` 
            });
          }
        }
      }
    }

    await config.save();
    res.json({ success: true, config, warning: warnings.length > 0 ? warnings.join(" ") : null });
  } catch (error) {
    console.error('Error updating config:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Run dynamic auto-adjustment
// @route   POST /api/patient-config/:patientId/dynamic-adjust/:gameName
// @access  System/Internal (called after game session save)
const runDynamicAdjustment = async (req, res) => {
  try {
    const { patientId, gameName } = req.params;
    const config = await PatientGameConfig.findOne({ patientId });
    if (!config || !config.games[gameName]) {
      return res.json({ success: true, message: 'No config found, skipped' });
    }

    // Fetch last 30 sessions for this game & patient (within last 7 days ideally, but up to 30)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const sessions = await GameSession.find({
      patientId,
      gameType: gameName,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(30);

    if (sessions.length < 20) {
       // Not enough data to make a statistically robust change
       return res.json({ success: true, message: 'Not enough sessions for robust adjustment (min 20).' });
    }

    // Calculate trend (simple linear regression slope or average halves comparison)
    const scores = sessions.map(s => s.score || 0).reverse(); // Oldest to newest
    const half = Math.floor(scores.length / 2);
    const firstHalfAvg = scores.slice(0, half).reduce((a,b)=>a+b, 0) / half;
    const secondHalfAvg = scores.slice(half).reduce((a,b)=>a+b, 0) / (scores.length - half);
    
    let isImproving = secondHalfAvg > firstHalfAvg * 1.05; // 5% improvement threshold
    let isWorsening = secondHalfAvg < firstHalfAvg * 0.95;

    let updated = false;

    // Loop through parameters for this game
    for (const [paramName, paramData] of Object.entries(config.games[gameName])) {
      if (paramData.modality === 'DYNAMIC') {
        let newVal = paramData.value;
        
        // Example logic:
        if (isImproving) {
          // Increase difficulty (meaning changes based on parameter)
          // e.g. lower response timer by 5%
          newVal = newVal * (paramName.includes('Timer') || paramName.includes('Zone') ? 0.95 : 1.05); 
        } else if (isWorsening) {
          // Ease difficulty slightly
          newVal = newVal * (paramName.includes('Timer') || paramName.includes('Zone') ? 1.02 : 0.98);
        }

        const clamped = clamp(newVal, paramData.minBound, paramData.maxBound);
        if (paramData.value !== clamped) {
          paramData.value = clamped;
          updated = true;
        }
      }
    }

    if (updated) {
      await config.save();
    }

    res.json({ success: true, updated, config });
  } catch (error) {
    console.error('Error dynamic adjust:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  runDynamicAdjustment
};
