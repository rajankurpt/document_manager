const express = require('express');
const protect = require('../middleware/authMiddleware');
const ctrl = require('../controllers/assignmentController');

const router = express.Router();

router.use(protect);

router.post('/', ctrl.createAssignment);
router.get('/', ctrl.listAssignments);
router.get('/my', ctrl.getMyAssignments);
router.get('/:id', ctrl.getAssignmentDetail);

module.exports = router;
