const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/authapp',
  JWT_SECRET: process.env.JWT_SECRET || 'secretkey',
  COOKIE_NAME: process.env.COOKIE_NAME || 'token',
  UPLOADS_DIR: path.join(__dirname, '..', '..', 'public', 'uploads'),
};
