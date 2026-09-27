const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'ayurhealth_admin_jwt_secret_2026';

// Seed default administrator if collection is empty
const seedInitialAdmin = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const count = await Admin.countDocuments();
    if (count === 0) {
      const hashedPassword = await Admin.hashPassword('admin123');
      await Admin.create({
        name: 'Dr. Clinic Admin',
        email: 'admin@ayurhealth.com',
        password: hashedPassword,
        role: 'admin',
      });
      console.log(`\n------------------------------------------`);
      console.log(`>>> Initial Admin Account Created in MongoDB:`);
      console.log(`Email: admin@ayurhealth.com`);
      console.log(`Password: admin123`);
      console.log(`------------------------------------------\n`);
    }
  } catch (err) {
    console.warn('[Admin Seed] Note:', err.message);
  }
};

// Admin Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. If MongoDB is connected, authenticate against database
    if (mongoose.connection.readyState === 1) {
      const admin = await Admin.findOne({ email: cleanEmail });
      if (!admin) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    }

    // 2. Fallback mode if MongoDB is offline: default fallback credentials
    if (cleanEmail === 'admin@ayurhealth.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: 'fallback-admin', email: cleanEmail, role: 'admin', name: 'Dr. Clinic Admin (Offline)' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        token,
        admin: {
          id: 'fallback-admin',
          name: 'Dr. Clinic Admin',
          email: cleanEmail,
          role: 'admin',
        },
      });
    }

    return res.status(401).json({ error: 'Invalid email or password.' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal Server Error during authentication.' });
  }
};

// Verify Token / Get Current Admin
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      success: true,
      admin: decoded,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = {
  login,
  getMe,
  seedInitialAdmin,
};
