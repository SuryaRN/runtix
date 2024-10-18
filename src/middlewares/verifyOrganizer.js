const pool = require('../config/db');

// Middleware untuk memverifikasi hak akses penyelenggara
const verifyOrganizer = async (req, res, next) => {
  const userId = req.user.id; // Dapatkan ID user dari token JWT
  const eventId = req.params.eventId; // Dapatkan ID event dari parameter URL

  try {
    const result = await pool.query('SELECT created_by FROM events WHERE id = $1', [eventId]);
    const event = result.rows[0];

    if (!event) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    // Periksa apakah user adalah penyelenggara event
    if (event.created_by !== userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk mengedit event ini' });
    }

    // Jika user adalah penyelenggara, lanjutkan ke endpoint berikutnya
    next();
  } catch (err) {
    console.error('Error verifying organizer:', err);
    res.status(500).json({ error: 'Gagal memverifikasi hak akses penyelenggara' });
  }
};

module.exports = { verifyOrganizer };
