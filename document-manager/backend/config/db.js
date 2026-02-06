const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
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

    // Create assignments table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_at DATETIME NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('Assignments table is ready.');

    // Create assignment_users table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assignment_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'submitted', 'late') DEFAULT 'pending',
        submitted_at DATETIME NULL,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY assignment_user_unique (assignment_id, user_id)
      );
    `);
    console.log('Assignment_users table is ready.');

    // Add assignment_id column to documents table if it doesn't exist
    const [assignmentIdRows] = await connection.query(`
      SHOW COLUMNS FROM documents LIKE 'assignment_id';
    `);
    if (assignmentIdRows.length === 0) {
      await connection.query(`
        ALTER TABLE documents
        ADD COLUMN assignment_id INT NULL,
        ADD CONSTRAINT fk_documents_assignment_id
          FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;
      `);
      console.log('documents table updated with assignment_id.');
    }

    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

module.exports = { pool, initDb };
