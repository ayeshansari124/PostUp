const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');

const getFeed = async (req, res) => {
  const posts = await Post.find()
    .populate('author', 'name profile')
    .sort({ createdAt: -1 })
    .lean();

  const user = await User.findById(req.userId).lean();

  res.render('feed', { user, posts });
};

const createPost = async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) return res.status(400).send('Content required');

  const post = await Post.create({ author: req.userId, content });
  await User.findByIdAndUpdate(req.userId, { $push: { posts: post._id } });

  res.redirect('/feed');
};

const redirectToEdit = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.redirect('/profile');
  return res.redirect(`/profile?editPostId=${id}`);
};

const submitEdit = async (req, res) => {
  const postId = req.params.id;
  const content = (req.body.content || '').trim();
  if (!content) return res.status(400).send('Content required');

  const post = await Post.findById(postId);
  if (!post) return res.status(404).send('Post not found');
  if (String(post.author) !== String(req.userId)) return res.status(403).send('Unauthorized');

  post.content = content;
  await post.save();

  res.redirect('/profile');
};

const deletePost = async (req, res) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);

  if (!post) return res.status(404).send("Post not found");
  if (String(post.author) !== String(req.userId)) return res.status(403).send("Unauthorized");

  await Post.findByIdAndDelete(postId);
  await User.findByIdAndUpdate(req.userId, { $pull: { posts: postId } });

  return res.redirect(req.get('referer') || '/feed');
};

const toggleLike = async (req, res) => {
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
};

module.exports = {
  getFeed,
  createPost,
  redirectToEdit,
  submitEdit,
  deletePost,
  toggleLike
};
