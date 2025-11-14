const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ username, password, role = 'User' }) {
    // Only allow creating Office User and Faculty roles
    if (role === 'Admin') {
      throw new Error('Cannot create admin user');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    return result.insertId;
  },

  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async findAll() {
    const [rows] = await pool.query('SELECT id, username, role, is_blocked, created_at FROM users ORDER BY created_at DESC');
    return rows;
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  },

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  },

  async blockUser(id) {
    await pool.query('UPDATE users SET is_blocked = TRUE WHERE id = ?', [id]);
  },

  async unblockUser(id) {
    await pool.query('UPDATE users SET is_blocked = FALSE WHERE id = ?', [id]);
  },

  async createAdminIfNotExists() {
    const adminUsername = 'admin';
    const adminPassword = 'mcaadmin@bmsce';
    
    const existingAdmin = await this.findByUsername(adminUsername);
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [adminUsername, hashedPassword, 'Admin']
      );
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  }
};

// Create admin user when this module is loaded
User.createAdminIfNotExists().catch(console.error);

module.exports = User;
