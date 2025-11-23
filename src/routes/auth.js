const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { register, login, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/logout', logout);

module.exports = router;
