const express = require('express');
const pool = require('../config/db');
const { verifyToken, isAdmin } = require('../utils/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Endpoint untuk memverifikasi penyelenggara event oleh admin
router.post(
  '/verify-organizer/:userId',
  verifyToken, // Memastikan admin sudah login
  isAdmin, // Memastikan user yang memverifikasi adalah admin
  async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        'UPDATE users SET is_verified = TRUE WHERE id = $1 RETURNING is_verified',
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Organizer verified successfully', is_verified: result.rows[0].is_verified });
    } catch (err) {
      console.error('Failed to verify organizer:', err);
      res.status(500).json({ error: 'Failed to verify organizer' });
    }
  }
);

// Endpoint untuk membatalkan verifikasi penyelenggara event oleh admin
router.post(
  '/unverify-organizer/:userId',
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        'UPDATE users SET is_verified = FALSE WHERE id = $1 RETURNING is_verified',
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Organizer unverified successfully', is_verified: result.rows[0].is_verified });
    } catch (err) {
      console.error('Failed to unverify organizer:', err);
      res.status(500).json({ error: 'Failed to unverify organizer' });
    }
  }
);

module.exports = router;
