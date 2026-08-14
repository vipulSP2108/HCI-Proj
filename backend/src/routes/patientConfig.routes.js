const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getConfig,
  updateConfig,
  runDynamicAdjustment
} = require('../controllers/patientConfig.controller');

router.get('/:patientId', protect, getConfig);
router.put('/:patientId', protect, updateConfig);
router.post('/:patientId/dynamic-adjust/:gameName', protect, runDynamicAdjustment);

module.exports = router;
