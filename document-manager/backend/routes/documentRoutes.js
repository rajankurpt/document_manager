const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/documentController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use username from req.user (set by protect middleware)
    const username = req.user && req.user.username ? req.user.username : 'unknown';
    const userDir = path.join('uploads', username);
    // Ensure the directory exists
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .xlsx, .pdf, and .docx are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter });

// Protect all document routes
router.use(protect);

router.post('/upload', upload.single('file'), ctrl.upload);
router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);
router.post('/merge/excel', ctrl.mergeExcel);
router.post('/merge/pdf', ctrl.mergePdf);
router.post('/report', ctrl.generateReport);
router.delete('/:id', ctrl.deleteDocument);

module.exports = router;
