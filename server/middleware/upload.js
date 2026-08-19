const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP, or GIF images are allowed"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Media-library uploads additionally allow a small set of safe video
// formats. Still validated by both extension and MIME type, still random
// filenames, still size-capped (larger cap for video).
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"].includes(ext)
      ? ext
      : file.mimetype.startsWith("video/")
      ? ".mp4"
      : ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, unique);
  },
});

function mediaFileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP, GIF images or MP4/WEBM videos are allowed"));
}

const uploadMedia = multer({
  storage: mediaStorage,
  fileFilter: mediaFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB, generous enough for short clips
});

module.exports = { upload, uploadMedia, uploadDir };
