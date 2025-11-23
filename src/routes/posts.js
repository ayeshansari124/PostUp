const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const postController = require('../controllers/postController');

const router = express.Router();

router.get('/feed', auth, asyncHandler(postController.getFeed));
router.post('/post', auth, asyncHandler(postController.createPost));

// edit flow
router.get('/posts/:id/edit', auth, asyncHandler(postController.redirectToEdit));
router.post('/posts/:id/edit', auth, asyncHandler(postController.submitEdit));
router.post('/posts/:id/delete', auth, asyncHandler(postController.deletePost));
router.post('/posts/:id/like', auth, asyncHandler(postController.toggleLike));

module.exports = router;
