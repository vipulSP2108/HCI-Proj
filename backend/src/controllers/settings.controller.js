const GlobalSettings = require('../models/globalSettings.model');

// @desc    Get global settings
// @route   GET /api/settings
// @access  Public (or authenticated)
const getSettings = async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching global settings:', error);
    res.status(500).json({ message: 'Server error fetching global settings' });
  }
};

// @desc    Update global settings
// @route   PUT /api/settings
// @access  Admin
const updateSettings = async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    
    // Only update fields that are provided
    const fields = [
      'testingMode',
      'pianoSessionSeconds',
      'boardDrawingSessionSeconds',
      'fruitBasketSessionSeconds',
      'shapeTracingSessionSeconds',
      'inCamGameSessionSeconds',
      'boardDrawingAssistiveMode',
      'testingPianoDisabledKeys',
      'testingPianoKeyTimer',
      'testingPianoSequence',
      'testingPianoMobileSequence',
      'testingShapeSequence',
      'testingFruitBasketSequence',
      'fruitBasketCoordSampleMs',
      'boardDrawingCoordSampleMs',
      'testingShapeTimer',
      'testingShapeSessionSeconds',
      'testingPianoWristKeysCount',
      'testingPianoWristTimer',
      'testingPianoWristSequence',
      'fruitBasketCooldownSeconds',
      'fruitBasketMaxAttempts',
      'fruitBasketAttemptTimeoutSeconds'
    ];
    fields.forEach(field => {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    });

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error updating global settings:', error);
    res.status(500).json({ message: 'Server error updating global settings' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
