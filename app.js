require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getIsConnected } = require('./config/db');
const consultationRoutes = require('./routes/consultationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getIsConnected() ? 'MongoDB Connected' : 'Local Storage Fallback (MongoDB Disconnected)',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', consultationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Ayurvedic Health Assessment API running',
    databaseStatus: getIsConnected() ? 'Connected to MongoDB' : 'Running in Local Storage Fallback Mode',
  });
});

app.listen(PORT, () => {
  console.log(`\n==========================================`);
  console.log(`AyurHealth Backend Server Active`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
  console.log(`==========================================\n`);
});

module.exports = app;
