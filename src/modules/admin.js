const express = require('express');
const pool = require('../config/db');
const { verifyToken, isAdmin } = require('../utils/auth');
const router = express.Router();

router.post('/verify-organizer/:userId', verifyToken, isAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('UPDATE users SET is_verified = true WHERE id = $1 RETURNING id, name, is_verified', [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ message: 'Organizer verified successfully', user });
  } catch (err) {
    console.error('Failed to verify organizer:', err);
    res.status(500).json({ error: 'Failed to verify organizer' });
  }
});

module.exports = router;
