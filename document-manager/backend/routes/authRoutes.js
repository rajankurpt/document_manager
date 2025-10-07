const express = require('express');
const { login, createUser, getAllUsers, updatePassword, deleteUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/users', authMiddleware, createUser); // Admin only
router.get('/users', authMiddleware, getAllUsers); // Admin only
router.put('/users/:id/password', authMiddleware, updatePassword); // Admin only
router.delete('/users/:id', authMiddleware, deleteUser); // Admin only

module.exports = router;
