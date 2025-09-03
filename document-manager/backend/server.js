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
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) => res.send('Document Manager API '));   // simple health check
app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
