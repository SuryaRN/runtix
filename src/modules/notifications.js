const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../utils/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Update preferensi notifikasi pengguna
router.post(
  '/notifications/preferences',
  verifyToken, // Middleware untuk verifikasi token JWT
  [
    body('event_id').isInt().withMessage('Event ID must be an integer'),
    body('notify_before_event').isBoolean().withMessage('Notify before event must be boolean'),
    body('notify_racepack').isBoolean().withMessage('Notify for racepack must be boolean'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { event_id, notify_before_event, notify_racepack } = req.body;
    const user_id = req.user.id;

    try {
      // Menggunakan ON CONFLICT untuk mengupdate jika preferensi sudah ada
      const result = await pool.query(
        `INSERT INTO notifications (user_id, event_id, notify_before_event, notify_racepack) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id, event_id) 
         DO UPDATE SET notify_before_event = EXCLUDED.notify_before_event, notify_racepack = EXCLUDED.notify_racepack`,
        [user_id, event_id, notify_before_event, notify_racepack]
      );
      
      res.json({ message: 'Notification preferences updated' });
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

module.exports = router;
