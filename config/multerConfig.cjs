const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const uploadPath = path.join(__dirname, "..", "public", "uploads");

// ensure directory exists (you already do that in index.js but safe here too)
const fs = require("fs");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    crypto.randomBytes(12, (err, bytes) => {
      if (err) return cb(err);
      const filename = bytes.toString("hex") + path.extname(file.originalname);
      cb(null, filename);
    });
  }
});

function fileFilter(req, file, cb) {
  // allow only images
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
