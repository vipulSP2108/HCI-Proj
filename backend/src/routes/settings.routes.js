const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/', settingsController.getSettings);
router.put('/', protect, adminOnly, settingsController.updateSettings);

module.exports = router;
