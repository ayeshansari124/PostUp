const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, COOKIE_NAME } = require('../config');

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).send('Missing fields');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).send('User already exists');

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });

  return res.redirect('/feed');
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Missing fields');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).send('Invalid email or password');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).send('Invalid email or password');

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });

  return res.redirect('/feed');
};

const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/');
};

module.exports = { register, login, logout };
