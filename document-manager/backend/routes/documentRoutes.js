const express = require('express');
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads'),
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
router.delete('/:id', ctrl.deleteDocument);

module.exports = router;
