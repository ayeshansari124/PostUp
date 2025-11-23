const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/user/:id', auth, asyncHandler(profileController.viewProfile));
router.get('/profile', auth, asyncHandler(profileController.myProfile));

router.post('/profile/upload', auth, ...profileController.handleUpload);

router.get('/search', auth, asyncHandler(profileController.search));

module.exports = router;
