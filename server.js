require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { PORT, MONGO_URI } = require('./src/config');
const errorHandler = require('./src/middleware/errorHandler');

// route modules
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const profileRoutes = require('./src/routes/profile');

const app = express();

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// express config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// connect db
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// simple pages
app.get('/', (req, res) => res.render('index'));
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));

// mount routers (preserves identical routes)
app.use('/', authRoutes);      // /register, /login, /logout
app.use('/', postRoutes);      // /post, /posts/:id/...
app.use('/', profileRoutes);   // /profile, /user/:id, /search, /profile/upload

// error handler (last)
app.use(errorHandler);

const port = PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
