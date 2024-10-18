const rateLimit = require('express-rate-limit');

// Rate limiting middleware untuk event creation
const createEventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 request dalam 15 menit
  message: "Terlalu banyak percobaan membuat event, coba lagi setelah 15 menit.",
});

module.exports = { createEventLimiter };
