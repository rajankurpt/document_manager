const Assignment = require('../models/Assignment');

exports.createAssignment = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  const { title, description, dueAt, userIds } = req.body;

  if (!title || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Title and at least one user are required.' });
  }

  const due_at = dueAt || null;

  try {
    const assignmentId = await Assignment.createWithUsers({
      title,
      description,
      due_at,
      created_by: req.user.id,
      userIds,
    });

    res.status(201).json({ message: 'Assignment created successfully.', assignmentId });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.listAssignments = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  try {
    const assignments = await Assignment.findAllWithStats();
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getAssignmentDetail = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  const { id } = req.params;

  try {
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    const users = await Assignment.findUsersForAssignment(id);
    res.json({ assignment, users });
  } catch (error) {
    console.error('Error fetching assignment detail:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.findForUser(req.user.id);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
