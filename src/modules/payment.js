const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const router = express.Router();
const snap = require('../config/midtrans');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/auth');

// Rate limiting untuk pembayaran
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10, // Maksimal 10 request dalam 15 menit
    message: "Too many payment attempts, please try again later."
});

// Validasi pada endpoint pembayaran
router.post(
    '/payment',
    verifyToken,
    paymentLimiter,
    [
        body('registration_id').isInt().withMessage('Registration ID must be an integer'),
        body('order_id').isString().notEmpty().withMessage('Order ID is required and should be a string'),
        body('gross_amount').isFloat({ min: 0 }).withMessage('Gross amount must be a positive number'),
        body('customer_name').isString().notEmpty().withMessage('Customer name is required'),
        body('customer_email').isEmail().withMessage('Customer email must be a valid email address'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error(`Validation failed for payment: ${JSON.stringify(errors.array())}`);
            return res.status(400).json({ errors: errors.array() });
        }

        const { registration_id, order_id, gross_amount, customer_name, customer_email } = req.body;
        let parameter = {
            transaction_details: { order_id, gross_amount },
            customer_details: { first_name: customer_name, email: customer_email },
            credit_card: { secure: true }
        };

        try {
            const transaction = await snap.createTransaction(parameter);
            
            logger.info(`Transaction successful for Order ID: ${order_id}, Registration ID: ${registration_id}, Transaction Token: ${transaction.token}`);
            
            // Simpan order_id di dalam tabel payments
            await pool.query(
                'INSERT INTO payments (registration_id, amount, status, order_id) VALUES ($1, $2, $3, $4)',
                [registration_id, gross_amount, 'pending', order_id]
            );

            logger.info(`Transaction saved for Order ID: ${order_id} with Registration ID: ${registration_id}`);
            res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
        } catch (error) {
            logger.error(`Failed to create transaction for Order ID: ${order_id}, Error: ${error.message}`);
            res.status(500).json({ error: 'Failed to create transaction', details: error.message });
        }
    }
);

// Notifikasi Midtrans
const notificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 20, // Maksimal 20 request notifikasi dalam 15 menit
    message: "Too many notification requests, please try again later."
});

router.post('/midtrans-notification', notificationLimiter, async (req, res) => {
    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;

    // Ambil nilai-nilai yang dibutuhkan dari request body
    const orderId = req.body.order_id;
    const statusCode = req.body.status_code;
    const grossAmount = req.body.gross_amount;
    const receivedSignature = req.body.signature_key || '';

    // Log semua parameter yang diterima
    logger.info(`Received Order ID: ${orderId}`);
    logger.info(`Received Status Code: ${statusCode}`);
    logger.info(`Received Gross Amount: ${grossAmount}`);

    // Konversi nilai gross_amount menjadi string dengan dua angka desimal
    const formattedGrossAmount = parseFloat(grossAmount).toFixed(2);

    // Gabungkan order_id, gross_amount, dan status_code sesuai dengan dokumentasi Midtrans
    const payload = orderId + statusCode + formattedGrossAmount + midtransServerKey;

    // Log payload yang akan digunakan untuk validasi signature
    logger.info(`Generated Payload: ${payload}`);

    // Hasilkan signature dari payload dan server key
    const expectedSignature = crypto.createHash('sha512').update(payload).digest('hex');

    // Logging untuk signature
    logger.info(`Received signature: ${receivedSignature}`);
    logger.info(`Expected signature: ${expectedSignature}`);

    // Verifikasi signature
    if (receivedSignature !== expectedSignature) {
        logger.error(`Invalid signature for Order ID: ${orderId}`);
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const transactionStatus = req.body.transaction_status;

    try {
        if (transactionStatus === 'settlement') {
            await pool.query('UPDATE payments SET status = $1 WHERE order_id = $2', ['success', orderId]);
        } else if (transactionStatus === 'pending') {
            await pool.query('UPDATE payments SET status = $1 WHERE order_id = $2', ['pending', orderId]);
        } else if (transactionStatus === 'expire') {
            await pool.query('UPDATE payments SET status = $1 WHERE order_id = $2', ['expired', orderId]);
        } else if (transactionStatus === 'cancel') {
            await pool.query('UPDATE payments SET status = $1 WHERE order_id = $2', ['cancelled', orderId]);
        }

        logger.info(`Notification processed for Order ID: ${orderId} with Status: ${transactionStatus}`);
        res.status(200).send('Notification received');
    } catch (error) {
        logger.error(`Error processing Midtrans notification for Order ID: ${orderId}, Error: ${error.message}`);
        res.status(500).send('Error processing notification');
    }
});

module.exports = router;
