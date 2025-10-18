const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, doctorOnly } = require('../middleware/auth.middleware');

router.post('/create', protect, doctorOnly, userController.createUser);
router.get('/my-patients', protect, doctorOnly, userController.getMyPatients);
router.get('/:userId', protect, userController.getUserDetails);

module.exports = router;
