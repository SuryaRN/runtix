// middlewares/verifyOrganizerStatus.js
const pool = require('../config/db');

const verifyOrganizerStatus = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const result = await pool.query('SELECT is_verified FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user || !user.is_verified) {
      return res.status(403).json({ error: 'Organizer is not verified' });
    }

    next();
  } catch (err) {
    console.error('Failed to verify organizer status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { verifyOrganizerStatus };
