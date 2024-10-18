const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('../config/db');

// Middleware untuk memverifikasi token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded; // Simpan user dari token ke dalam req.user
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// Middleware untuk memverifikasi apakah user adalah admin
const isAdmin = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (user && user.role === 'admin') {
      next(); // Lanjutkan jika user adalah admin
    } else {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
  } catch (err) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
};

// Middleware untuk menangani CSRF token
const csrfProtection = (req, res, next) => {
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.session.csrfToken) {
        return res.status(403).json({ message: 'CSRF token invalid or missing.' });
    }
    next();
};

// Fungsi untuk menambahkan CSRF token ke dalam sesi user
const generateCsrfToken = (req, res) => {
    const csrfToken = require('crypto').randomBytes(64).toString('hex');
    req.session.csrfToken = csrfToken;
    return csrfToken;
};

// Token generator untuk JWT
const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

module.exports = { generateToken, verifyToken, isAdmin, csrfProtection, generateCsrfToken };
