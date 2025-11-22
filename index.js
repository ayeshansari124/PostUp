require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const upload = require('./config/multerConfig.cjs');

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

// ensure uploads dir exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- Auth middleware ---
function isLoggedIn(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
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

// --- Simple pages ---
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

    return res.redirect('/feed');
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

    return res.redirect('/feed');
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

// --- Feed (global) ---
app.get('/feed', isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name profile')
      .sort({ createdAt: -1 })
      .lean();

    const user = await User.findById(req.userId).lean();

    res.render('feed', { user, posts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- View any user's profile and their posts ---
app.get('/user/:id', isLoggedIn, async (req, res) => {
  try {
    const uid = req.params.id;
    const profileUser = await User.findById(uid).populate({
      path: 'posts',
      options: { sort: { createdAt: -1 } }
    }).lean();
    if (!profileUser) return res.status(404).send('User not found');

    const me = await User.findById(req.userId).lean();
    res.render('profile', { user: me, profileUser, editPostId: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- My profile (personal) ---
app.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate({
      path: 'posts',
      options: { sort: { createdAt: -1 } }
    }).lean();

    if (!me) return res.status(404).send('User not found');

    // allow editPostId to return to same view
    const editPostId = req.query.editPostId ? String(req.query.editPostId) : null;

    res.render('profile', { user: me, profileUser: null, editPostId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Create a post (redirect to feed) ---
app.post('/post', isLoggedIn, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).send('Content required');

    const post = await Post.create({ author: req.userId, content });
    await User.findByIdAndUpdate(req.userId, { $push: { posts: post._id } });

    res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- GET edit link handler for redirecting with editPostId ---
app.get('/posts/:id/edit', isLoggedIn, async (req, res) => {
  const id = req.params.id;
  if (!id) return res.redirect('/profile');
  return res.redirect(`/profile?editPostId=${id}`);
});

// --- Submit edit (PUT/POST) ---
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

// --- Delete post ---
app.post('/posts/:id/delete', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).send("Post not found");
    if (String(post.author) !== String(req.userId)) return res.status(403).send("Unauthorized");

    await Post.findByIdAndDelete(postId);
    await User.findByIdAndUpdate(req.userId, { $pull: { posts: postId } });

    // if user on feed, go back to feed; otherwise profile
    return res.redirect(req.get('referer') || '/feed');
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

// --- Like (toggle) ---
// This toggles like and returns to referring page (feed or profile)
app.post('/posts/:id/like', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).send('Invalid post id');

    const post = await Post.findById(postId);
    if (!post) return res.status(404).send('Post not found');

    const alreadyLiked = post.likes.map(l => String(l)).includes(String(userId));

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    return res.redirect(req.get('referer') || '/feed');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Upload profile pic ---
app.get('/profile/upload', isLoggedIn, async (req, res) => {
  res.render('profileUpload');
});

app.post('/profile/upload', isLoggedIn, upload.single("profile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    // Save relative public path (served from /uploads)
    await User.findByIdAndUpdate(req.userId, {
      profile: "/uploads/" + req.file.filename
    });

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

app.get("/search", async (req, res) => {
  const user = req.user;
  const query = req.query.q || "";

  const results = await User.find(
    query ? { name: new RegExp(query, "i") } : {}
  );

  res.render("search", { results, query, user });
});




app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
