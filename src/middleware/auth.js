const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, COOKIE_NAME } = require('../config');

/**
 * Attaches req.userId (and optionally req.user) when token valid.
 * Redirects to /login for HTML requests and returns 401 for APIs when not.
 */
module.exports = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).send('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    // lightweight user lean object (for templates)
    req.user = await User.findById(req.userId).lean();
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).send('Unauthorized');
  }
};
