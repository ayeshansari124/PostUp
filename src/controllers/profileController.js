// src/controllers/profileController.js
const User = require('../models/User');
const upload = require('../config/multerConfig');

/**
 * View another user's profile (populates posts -> author)
 */
const viewProfile = async (req, res) => {
  try {
    const uid = req.params.id;

    const profileUser = await User.findById(uid)
      .populate({
        path: 'posts',
        populate: { path: 'author', select: 'name profile' }, // <-- IMPORTANT
        options: { sort: { createdAt: -1 } }
      })
      .lean();

    if (!profileUser) return res.status(404).send('User not found');

    const me = await User.findById(req.userId)
      .populate({
        path: 'posts',
        populate: { path: 'author', select: 'name profile' },
        options: { sort: { createdAt: -1 } }
      })
      .lean();

    // DEBUG: (optional) log to verify populated author
    // console.log('viewProfile - sample post author:', profileUser.posts && profileUser.posts[0] && profileUser.posts[0].author);

    res.render('profile', { user: me, profileUser, editPostId: null });
  } catch (err) {
    console.error('viewProfile error:', err);
    res.status(500).send('Server error');
  }
};

/**
 * My profile (the logged-in user's profile page)
 */
const myProfile = async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate({
        path: 'posts',
        populate: { path: 'author', select: 'name profile' }, // <-- IMPORTANT
        options: { sort: { createdAt: -1 } }
      })
      .lean();

    if (!me) return res.status(404).send('User not found');

    const editPostId = req.query.editPostId ? String(req.query.editPostId) : null;

    // DEBUG: (optional) inspect one post author object
    // console.log('myProfile - sample post author:', me.posts && me.posts[0] && me.posts[0].author);

    res.render('profile', { user: me, profileUser: null, editPostId });
  } catch (err) {
    console.error('myProfile error:', err);
    res.status(500).send('Server error');
  }
};

module.exports = {
  viewProfile,
  myProfile,
  showUploadForm: async (req, res) => res.render('profileUpload'),
  handleUpload: [
    upload.single('profile'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).send('No file uploaded');
        await User.findByIdAndUpdate(req.userId, { profile: '/uploads/' + req.file.filename });
        res.redirect('/profile');
      } catch (err) {
        console.error('handleUpload error:', err);
        res.status(500).send('Upload failed');
      }
    }
  ],
  search: async (req, res) => {
    const me = req.user;
    const query = req.query.q || "";
    const results = await User.find(query ? { name: new RegExp(query, "i") } : {}).lean();
    res.render('search', { results, query, user: me });
  }
};
