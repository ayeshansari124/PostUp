const mongoose = require("mongoose");
const streamifier = require("streamifier");

const User = require("../models/User");
const upload = require("../config/multerConfig");
const cloudinary = require("../config/cloudinary");

const populatePosts = {
  path: "posts",
  populate: { path: "author", select: "name profile" },
  options: { sort: { createdAt: -1 } },
};

// ================= VIEW OTHER USER PROFILE =================
const viewProfile = async (req, res) => {
  try {
    const uid = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(uid)) {
      return res.status(400).send("Invalid user id");
    }

    const profileUser = await User.findById(uid).populate(populatePosts).lean();

    if (!profileUser) {
      return res.status(404).send("User not found");
    }

    const me = await User.findById(req.userId).populate(populatePosts).lean();

    return res.render("profile", {
      user: me,
      profileUser,
      editPostId: null,
    });
  } catch (err) {
    console.error("viewProfile error:", err);
    return res.status(500).send("Server error");
  }
};

// ================= MY PROFILE =================
const myProfile = async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate(populatePosts).lean();

    if (!me) {
      return res.status(404).send("User not found");
    }

    return res.render("profile", {
      user: me,
      profileUser: null,
      editPostId: req.query.editPostId ? String(req.query.editPostId) : null,
    });
  } catch (err) {
    console.error("myProfile error:", err);
    return res.status(500).send("Server error");
  }
};

// ================= PROFILE IMAGE UPLOAD =================
const handleUpload = [
  upload.single("profile"),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "postup_profiles" },
          (error, result) => (result ? resolve(result) : reject(error)),
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      await User.findByIdAndUpdate(req.userId, {
        profile: result.secure_url,
      });

      return res.redirect("/profile");
    } catch (err) {
      console.error("handleUpload error:", err);
      return res.status(500).send("Upload failed");
    }
  },
];

// ================= SEARCH USERS =================
const search = async (req, res) => {
  try {
    const me = await User.findById(req.userId).lean();
    const query = (req.query.q || "").trim();

    const results = await User.find(
      query ? { name: new RegExp(query, "i") } : {},
    ).lean();

    return res.render("search", {
      results,
      query,
      user: me,
    });
  } catch (err) {
    console.error("search error:", err);
    return res.status(500).send("Server error");
  }
};

module.exports = {
  viewProfile,
  myProfile,
  handleUpload,
  search,
};
