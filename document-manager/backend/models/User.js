const { pool } = require('../config/db');

const User = {
  async create({ username, password, role }) {
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );
    return result.insertId;
  },

  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },
};

module.exports = User;
