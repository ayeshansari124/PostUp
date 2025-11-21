require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const COOKIE_NAME = 'token';

// --- Connect to MongoDB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/authapp';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// --- Express config ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Auth middleware ---
function isLoggedIn(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    // If user expects HTML, redirect to login
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).send('Unauthorized');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    res.clearCookie(COOKIE_NAME);
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).send('Unauthorized');
  }
}

// --- Routes: simple views for index/login/register (keep minimal) ---
app.get('/', (req, res) => res.render('index'));

app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));

// --- Register ---
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).send('Missing fields');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).send('User already exists');

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });

    return res.redirect('/profile');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// --- Login ---
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Missing fields');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).send('Invalid email or password');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).send('Invalid email or password');

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });

    return res.redirect('/profile');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// --- Logout ---
app.get('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/');
});

// --- Profile (show posts) ---
app.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'posts',
      options: { sort: { createdAt: -1 } }
    });

    if (!user) return res.status(404).send('User not found');

    // Normalize editPostId
    const editPostId = req.query.editPostId ? String(req.query.editPostId) : null;

    // Make sure posts are populated as full Post docs (if stored incorrectly)
    // If user.posts are IDs only, populate them
    // (The populate above usually handles this.)
    res.render('profile', { user, editPostId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Create a post ---
app.post('/post', isLoggedIn, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).send('Content required');

    const post = await Post.create({ author: req.userId, content });
    await User.findByIdAndUpdate(req.userId, { $push: { posts: post._id } });

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- GET edit link handler: redirects to /profile with editPostId ---
app.get('/posts/:id/edit', isLoggedIn, async (req, res) => {
  const id = req.params.id;
  if (!id) return res.redirect('/profile');
  return res.redirect(`/profile?editPostId=${id}`);
});

// --- Submit edit ---
app.post('/posts/:id/edit', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).send('Content required');

    const post = await Post.findById(postId);
    if (!post) return res.status(404).send('Post not found');

    if (String(post.author) !== String(req.userId)) return res.status(403).send('Unauthorized');

    post.content = content;
    await post.save();
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Like (toggle) ---
app.post('/posts/:id/like', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).send('Invalid post id');

    const post = await Post.findById(postId);
    if (!post) return res.status(404).send('Post not found');

    // Convert ObjectId to string for safe comparison
    const alreadyLiked = post.likes.map(l => String(l)).includes(String(userId));

    if (alreadyLiked) {
      // Unlike
      post.likes.pull(userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/posts/:id/edit', isLoggedIn, async (req, res) => {
    const id = req.params.id;
    if (!id) return res.redirect('/profile');
    return res.redirect(`/profile?editPostId=${id}`);
  });

  app.post('/posts/:id/edit', isLoggedIn, async (req, res) => {
    try {
      const postId = req.params.id;
      const content = (req.body.content || '').trim();
  
      if (!content) return res.status(400).send('Content required');
  
      const post = await Post.findById(postId);
      if (!post) return res.status(404).send('Post not found');
  
      if (String(post.author) !== String(req.userId))
        return res.status(403).send('Unauthorized');
  
      post.content = content;
      await post.save();
  
      res.redirect('/profile');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  app.post('/posts/:id/delete', isLoggedIn, async (req, res) => {
    try {
      const postId = req.params.id;
      const post = await Post.findById(postId);
  
      if (!post) return res.status(404).send("Post not found");
      if (String(post.author) !== String(req.userId))
        return res.status(403).send("Unauthorized");
  
      await Post.findByIdAndDelete(postId);
  
      await User.findByIdAndUpdate(req.userId, {
        $pull: { posts: postId }
      });
  
      res.redirect('/profile');
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error");
    }
  });
  

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
