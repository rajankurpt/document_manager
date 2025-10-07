const { pool } = require('../config/db');

const Document = {
  async create({ title, description, filePath, userId }) {
    const [result] = await pool.query(
      'INSERT INTO documents (title, description, file_path, user_id) VALUES (?, ?, ?, ?)',
      [title, description, filePath, userId]
    );
    return { id: result.insertId, title, description, file_path: filePath, user_id: userId };
  },

  async findAll(user) {
    if (user.role === 'Admin') {
      console.log('Admin user ID:', user.id);
      
      // First, let's check for any orphaned documents
      const [orphanedDocs] = await pool.query(`
        SELECT d.* FROM documents d 
        LEFT JOIN users u ON d.user_id = u.id 
        WHERE u.id IS NULL
      `);
      console.log('Orphaned documents:', orphanedDocs);
      
      const [rows] = await pool.query(`
        SELECT d.*, 
               COALESCE(u.username, 'Unknown User') as username,
               CASE 
                 WHEN d.user_id = ? THEN '(You)'
                 WHEN u.username IS NULL THEN 'Unknown User'
                 ELSE u.username 
               END as display_name
        FROM documents d 
        LEFT JOIN users u ON d.user_id = u.id 
        ORDER BY d.created_at DESC
      `, [user.id]);
      console.log('Admin query results:', rows);
      return rows;
    } else {
      const [rows] = await pool.query(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      );
      return rows;
    }
  },

  async findById(id, user) {
    try {
      let query = 'SELECT * FROM documents WHERE id = ?';
      const params = [id];
      
      if (user && user.role !== 'Admin') {
        query += ' AND user_id = ?';
        params.push(user.id);
      }
      
      const [rows] = await pool.query(query, params);
      return rows[0] || null;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  },

  async findAllExcelPaths(user) {
    if (user.role === 'Admin') {
      const [rows] = await pool.query(
        "SELECT file_path FROM documents WHERE LOWER(file_path) LIKE '%.xlsx' OR LOWER(file_path) LIKE '%.xls'"
      );
      return rows.map(r => r.file_path);
    } else {
      const [rows] = await pool.query(
        "SELECT file_path FROM documents WHERE user_id = ? AND (LOWER(file_path) LIKE '%.xlsx' OR LOWER(file_path) LIKE '%.xls')",
        [user.id]
      );
      return rows.map(r => r.file_path);
    }
  },

  async insertMergedExcel(filePath, userId) {
    const [result] = await pool.query(
      'INSERT INTO documents (title, description, file_path, user_id) VALUES (?, ?, ?, ?)',
      ['Merged Excel', 'Auto-merged Excel file', filePath, userId]
    );
    return result.insertId;
  },

  async findAllPdfPaths(user) {
    if (user.role === 'Admin') {
      const [rows] = await pool.query(
        "SELECT file_path FROM documents WHERE LOWER(file_path) LIKE '%.pdf'"
      );
      return rows.map(r => r.file_path);
    } else {
      const [rows] = await pool.query(
        "SELECT file_path FROM documents WHERE user_id = ? AND LOWER(file_path) LIKE '%.pdf'",
        [user.id]
      );
      return rows.map(r => r.file_path);
    }
  },

  async insertMergedPdf(filePath, userId) {
    const [result] = await pool.query(
      'INSERT INTO documents (title, description, file_path, user_id) VALUES (?, ?, ?, ?)',
      ['Merged PDF', 'Auto-merged PDF file', filePath, userId]
    );
    return result.insertId;
  },

  async insertMergedExcel(filePath, userId) {
    const [result] = await pool.query(
      'INSERT INTO documents (title, description, file_path, user_id) VALUES (?, ?, ?, ?)',
      ['Merged Excel', 'Auto-merged Excel file', filePath, userId]
    );
    return result.insertId;
  },

  async deleteById(id, user) {
    if (user.role === 'Admin') {
      const [result] = await pool.query('DELETE FROM documents WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } else {
      const [result] = await pool.query('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, user.id]);
      return result.affectedRows > 0;
    }
  }
};

module.exports = Document;
