require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/db');
const docRoutes = require('./routes/documentRoutes');
const authRoutes = require('./routes/authRoutes');

// Initialize Database
initDb();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) => res.send('Document Manager API '));   // simple health check
app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);

const PORT = process.env.PORT || 5005;

// For AWS Lambda
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const serverless = require('serverless-http');
  module.exports.handler = serverless(app);
} else {
  // For local development and other platforms
  app.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
}