const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../utils/auth');
const router = express.Router();

// Endpoint untuk mengunduh sertifikat
router.get('/certificate/:registrationId', verifyToken, async (req, res) => {
    const { registrationId } = req.params;
    const userId = req.user.id;
    
    console.log(`Fetching certificate for registrationId: ${registrationId}, userId: ${userId}`);
    
    try {
        // Gunakan parameterized query untuk mencegah SQL injection
        const result = await pool.query(
            'SELECT certificate_url, download_count FROM registrations WHERE id = $1 AND user_id = $2',
            [registrationId, userId]
        );
        
        console.log('Query result:', result.rows);

        const registration = result.rows[0];
        if (!registration) {
            console.log(`No registration found for registrationId: ${registrationId} and userId: ${userId}`);
            return res.status(404).json({ error: 'Certificate not found' });
        }

        if (!registration.certificate_url) {
            console.log(`No certificate URL found for registrationId: ${registrationId}`);
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // Update hitungan jumlah unduhan dengan prepared statement
        await pool.query('UPDATE registrations SET download_count = download_count + 1 WHERE id = $1', [registrationId]);
        
        console.log('Download count updated for registrationId:', registrationId);

        // Kirim URL sertifikat
        res.json({ certificate_url: registration.certificate_url });
    } catch (err) {
        console.error('Failed to fetch certificate:', err);
        res.status(500).json({ error: 'Failed to fetch certificate' });
    }
});

module.exports = router;
