const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  profile: { type: String, default: '/profile/defaultProfile.png' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
