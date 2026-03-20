const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || "") || ".bin";
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isEncryptedBlob =
    file.mimetype === "application/octet-stream" ||
    path.extname(file.originalname || "").toLowerCase() === ".bin" ||
    (file.originalname || "").startsWith("enc-");

  if (isEncryptedBlob || req.body?.encryptedFileMetadata) {
    return cb(null, true);
  }

  // Accept images, common document types, and audio files
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|text|txt|mpeg|mp3|wav|webm|ogg|m4a|mp4/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Error: File upload only supports the following filetypes - " + allowedTypes));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

module.exports = upload;
