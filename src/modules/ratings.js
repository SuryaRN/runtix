// File: runtix-backend/src/modules/ratings.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../utils/auth');

// Endpoint untuk memberikan rating event
router.post('/rate-event', verifyToken, async (req, res) => {
  const { event_id, rating } = req.body;
  const userId = req.user.id;

  try {
    // Validasi rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Simpan rating ke database
    await pool.query(
      'INSERT INTO ratings (user_id, event_id, rating) VALUES ($1, $2, $3)',
      [userId, event_id, rating]
    );

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Failed to submit rating:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

module.exports = router;
