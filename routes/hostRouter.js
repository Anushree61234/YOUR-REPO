const express = require('express');
const multer = require('multer');
const hostRouter = express.Router();

const hostController = require('../controllers/hostController');
const { storage } = require('../config/cloudinary');

const fileFilter = (req, file, cb) => {
  cb(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

hostRouter.get('/add-home', hostController.getAddHome);
hostRouter.post('/add-home', upload.single('photo'), hostController.postAddHome);

hostRouter.get('/hostHome', hostController.getHostHome);

hostRouter.get('/edit-home/:homeId', hostController.getEditHome);
hostRouter.post('/edit-home/:homeId', upload.single('photo'), hostController.postEditHome);

hostRouter.post('/delete-home/:homeId', hostController.postDeleteHome);

module.exports = hostRouter;
