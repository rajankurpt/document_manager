const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // your MySQL password
  database: process.env.DB_NAME || 'dept_project',
  waitForConnections: true,
  connectionLimit: 10,
});

const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to the database.');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin', 'Office User', 'Faculty') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table is ready.');

    // Create documents table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(255) NOT NULL,
        filetype VARCHAR(50) NOT NULL,
        size INT NOT NULL,
        folder_name VARCHAR(255) DEFAULT NULL,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('Documents table is ready.');

    // Add session column if it doesn't exist
    const [sessionRows] = await connection.query(`
      SHOW COLUMNS FROM documents LIKE 'session';
    `);
    if (sessionRows.length === 0) {
      await connection.query(`
        ALTER TABLE documents ADD COLUMN session VARCHAR(20);
      `);
      console.log('documents table updated with session.');
    }

    // Add semester column if it doesn't exist
    const [semesterRows] = await connection.query(`
      SHOW COLUMNS FROM documents LIKE 'semester';
    `);
    if (semesterRows.length === 0) {
      await connection.query(`
        ALTER TABLE documents ADD COLUMN semester INT;
      `);
      console.log('documents table updated with semester.');
    }

    // Add is_blocked column to users table if it doesn't exist
    const [blockedRows] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'is_blocked';
    `);
    if (blockedRows.length === 0) {
      await connection.query(`
        ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
      `);
      console.log('users table updated with is_blocked column.');
    }

    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

module.exports = { pool, initDb };
