const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../utils/auth');
const logger = require('../utils/logger');

// Endpoint untuk registrasi event dengan validasi dan otentikasi
router.post(
  '/register',
  verifyToken, // Menggunakan JWT untuk mendapatkan user_id
  [
    body('event_id').isInt().withMessage('Event ID must be an integer'),
    body('tshirt_size').isString().isLength({ max: 5 }).withMessage('T-shirt size must be a valid string and max 5 characters'),
    body('email').isEmail().withMessage('Email must be a valid email address'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(`Validation failed for registration: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({ errors: errors.array() });
    }

    const { event_id, tshirt_size, email } = req.body;
    const user_id = req.user.id; // Dapatkan user_id dari token JWT

    const sql = 'INSERT INTO registrations (user_id, event_id, tshirt_size) VALUES ($1, $2, $3) RETURNING id';

    try {
      const result = await pool.query(sql, [user_id, event_id, tshirt_size]);
      const registrationId = result.rows[0].id;

      logger.info(`User ID ${user_id} registered for Event ID ${event_id}`);
      res.json({ message: 'Registration successful', registrationId });
    } catch (err) {
      logger.error(`Failed to register user for event: ${err.message}`);
      res.status(500).json({ error: 'Failed to register for the event' });
    }
  }
);

// Endpoint untuk melihat riwayat registrasi event
router.get('/user/:userId/registrations', verifyToken, async (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT events.name AS event_name, events.date, events.location, registrations.tshirt_size, registrations.created_at 
    FROM registrations 
    JOIN events ON registrations.event_id = events.id 
    WHERE registrations.user_id = $1
  `;

  try {
    const result = await pool.query(sql, [userId]);
    logger.info(`Fetched registrations for user ${userId}`);
    res.json(result.rows);
  } catch (err) {
    logger.error(`Failed to fetch registrations for user ${userId}: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch user event history' });
  }
});

module.exports = router;
