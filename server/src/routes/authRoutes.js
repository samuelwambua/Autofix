const express = require('express');
const router  = express.Router();
const { registerStaff, registerClient, registerGarage, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register/staff',  registerStaff);
router.post('/register/client', registerClient);
router.post('/register/garage', registerGarage);
router.post('/login',           login);
router.get('/me',  protect,     getMe);

module.exports = router;