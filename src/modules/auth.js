const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit'); // Tambahkan impor ini
const pool = require('../config/db');
const { generateToken } = require('../utils/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Rate limiting pada login untuk mencegah brute force attack
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // Maksimal 5 kali percobaan login dalam waktu 15 menit
    message: "Terlalu banyak percobaan login, coba lagi setelah 15 menit."
});

// Fungsi untuk meng-hash password
async function hashPassword(plainPassword) {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return hashedPassword; // Mengembalikan hashed password
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Hashing error');
    }
}

// Register User
router.post(
    '/register-user',
    [
        body('name').trim().escape().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            // Hash password sebelum menyimpan ke database
            const hashedPassword = await hashPassword(password);
            const result = await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id', [name, email, hashedPassword]);
            const userId = result.rows[0].id;
            res.json({ message: 'User registered successfully', userId });
        } catch (err) {
            console.error('Failed to register user:', err);
            res.status(500).json({ error: 'Failed to register user' });
        }
    }
);

// Login User
router.post(
    '/login',
    loginLimiter, // Terapkan rate limiting pada endpoint login
    [
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            const token = generateToken(user);
            res.json({ token });
        } catch (err) {
            console.error('Error during login:', err);
            res.status(500).json({ error: 'Failed to login' });
        }
    }
);

module.exports = router;
