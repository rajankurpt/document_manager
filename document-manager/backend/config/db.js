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

    // Add user_id to documents table if it doesn't exist
    const [rows] = await connection.query(`
      SHOW COLUMNS FROM documents LIKE 'user_id';
    `);

    if (rows.length === 0) {
      await connection.query(`
        ALTER TABLE documents
        ADD COLUMN user_id INT,
        ADD FOREIGN KEY (user_id) REFERENCES users(id);
      `);
      console.log('documents table updated with user_id.');
    }

    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

module.exports = { pool, initDb };
