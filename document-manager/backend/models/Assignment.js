const { pool } = require('../config/db');

const Assignment = {
  async createWithUsers({ title, description, due_at, created_by, userIds }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO assignments (title, description, due_at, created_by) VALUES (?, ?, ?, ?)',
        [title, description, due_at, created_by]
      );
      const assignmentId = result.insertId;

      if (Array.isArray(userIds) && userIds.length > 0) {
        const values = userIds.map((userId) => [assignmentId, userId]);
        await connection.query(
          'INSERT INTO assignment_users (assignment_id, user_id) VALUES ? ',
          [values]
        );
      }

      await connection.commit();
      return assignmentId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async findAllWithStats() {
    const [rows] = await pool.query(`
      SELECT 
        a.*, 
        COUNT(au.id) AS assigned_count,
        SUM(CASE WHEN au.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
        SUM(CASE WHEN au.status = 'late' THEN 1 ELSE 0 END) AS late_count
      FROM assignments a
      LEFT JOIN assignment_users au ON au.assignment_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM assignments WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findUsersForAssignment(assignmentId) {
    const [rows] = await pool.query(
      `SELECT 
        au.*, 
        u.username, 
        u.role
      FROM assignment_users au
      JOIN users u ON au.user_id = u.id
      WHERE au.assignment_id = ?
      ORDER BY u.username ASC`,
      [assignmentId]
    );
    return rows;
  },

  async findForUser(userId) {
    const [rows] = await pool.query(
      `SELECT 
        a.*, 
        au.status, 
        au.submitted_at
      FROM assignment_users au
      JOIN assignments a ON au.assignment_id = a.id
      WHERE au.user_id = ?
      ORDER BY a.due_at IS NULL, a.due_at ASC, a.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async markSubmitted({ assignmentId, userId, isLate }) {
    const status = isLate ? 'late' : 'submitted';

    const [result] = await pool.query(
      `UPDATE assignment_users
       SET status = ?,
           submitted_at = CASE WHEN submitted_at IS NULL THEN NOW() ELSE submitted_at END
       WHERE assignment_id = ? AND user_id = ?`,
      [status, assignmentId, userId]
    );

    if (result.affectedRows === 0) {
      await pool.query(
        'INSERT INTO assignment_users (assignment_id, user_id, status, submitted_at) VALUES (?, ?, ?, NOW())',
        [assignmentId, userId, status]
      );
    }
  }
};

module.exports = Assignment;
