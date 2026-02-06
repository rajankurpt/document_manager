require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/db');
const docRoutes = require('./routes/documentRoutes');
const authRoutes = require('./routes/authRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

// Initialize Database
initDb();

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  'https://document-manager-navy-beta.vercel.app',
  'https://document-manager-hzqnrovrh-ankur-rajs-projects-743e67f4.vercel.app'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) => res.send('Document Manager API '));   // simple health check
app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/assignments', assignmentRoutes);

const PORT = process.env.PORT || 5005;

// For AWS Lambda
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const serverless = require('serverless-http');
  module.exports.handler = serverless(app);
} else {
  // For local development and other platforms
  app.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
}