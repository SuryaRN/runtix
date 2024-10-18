const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../utils/auth'); 
const { createEventLimiter } = require('../middlewares/rateLimit');
const { verifyOrganizerStatus } = require('../middlewares/verifyOrganizerStatus'); 
const { verifyOrganizer } = require('../middlewares/verifyOrganizer');

// Fetch events with pagination and filtering by city, category, and date
router.get('/events', async (req, res) => {
  const { city, category, date, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM events';
  let countSql = 'SELECT COUNT(*) FROM events';
  let conditions = [];
  let params = [];
  
  // Add filtering by city (location)
  if (city) {
    conditions.push('location = $' + (params.length + 1));
    params.push(city);
  }

  // Add filtering by category (5K, 10K, marathon, etc.)
  if (category) {
    conditions.push('category = $' + (params.length + 1));
    params.push(category);
  }

  // Add filtering by date
  if (date) {
    conditions.push('date = $' + (params.length + 1));
    params.push(date);
  }

  // Combine conditions into a WHERE clause if any conditions exist
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    sql += whereClause;
    countSql += whereClause;
  }

  // Add pagination with LIMIT and OFFSET
  sql += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  try {
    // Execute the SQL query to fetch events
    const result = await pool.query(sql, params);
    // Execute the COUNT query to get the total number of filtered events
    const totalRowsResult = await pool.query(countSql, params.slice(0, params.length - 2)); // Remove limit and offset from params for count query
    const totalRows = totalRowsResult.rows[0].count;

    // Respond with events data and pagination info
    res.json({ events: result.rows, total: totalRows, page, limit });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});


router.post(
  '/create-event',
  verifyToken, // Middleware untuk melindungi endpoint
  verifyOrganizerStatus, // Middleware untuk memverifikasi status penyelenggara terverifikasi
  createEventLimiter, // Rate limiter untuk membatasi jumlah request
  [
    body('name').trim().escape().notEmpty().withMessage('Name is required and should be a string'),
    body('location').trim().escape().notEmpty().withMessage('Location is required and should be a string'),
    body('map_location').trim().escape().notEmpty().withMessage('Map location is required and should be a valid Google Maps location'),
    body('route_map_url').optional().isURL().withMessage('Route map URL should be a valid URL'), // Optional URL
    body('category').isIn(['5K', '10K', 'Marathon']).withMessage('Category must be one of 5K, 10K, Marathon'), // Validasi kategori
    body('date').isDate().withMessage('Date should be in the correct format (YYYY-MM-DD)'),
    body('description').trim().escape().isString().withMessage('Description should be a string'),
    body('fee').isFloat({ min: 0 }).withMessage('Fee must be a positive number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, map_location, route_map_url, category, date, description, fee } = req.body;
    const userId = req.user.id;

    try {
      const result = await pool.query(
        `INSERT INTO events (name, location, map_location, route_map_url, category, date, description, fee, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [name, location, map_location, route_map_url, category, date, description, fee, userId]
      );
      res.json({ message: 'Event created successfully', eventId: result.rows[0].id });
    } catch (err) {
      console.error('Failed to create event:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);


// Route untuk mengedit event dengan verifikasi hak akses penyelenggara
router.put(
  '/edit-event/:eventId',
  verifyToken, 
  verifyOrganizer, 
  [
    body('name').optional().trim().escape().isString().withMessage('Name should be a string'),
    body('location').optional().trim().escape().isString().withMessage('Location should be a string'),
    body('date').optional().isDate().withMessage('Date should be in the correct format (YYYY-MM-DD)'),
    body('description').optional().trim().escape().isString().withMessage('Description should be a string'),
    body('fee').optional().isFloat({ min: 0 }).withMessage('Fee must be a positive number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, date, description, fee } = req.body;
    const { eventId } = req.params;

    try {
      await pool.query(
        'UPDATE events SET name = COALESCE($1, name), location = COALESCE($2, location), date = COALESCE($3, date), description = COALESCE($4, description), fee = COALESCE($5, fee) WHERE id = $6',
        [name, location, date, description, fee, eventId]
      );
      res.json({ message: 'Event updated successfully' });
    } catch (err) {
      console.error('Failed to update event:', err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// Fetch events created by a user
router.get('/my-events/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  const sql = 'SELECT * FROM events WHERE created_by = $1';

  try {
    const result = await pool.query(sql, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Fetch distinct event locations (cities)
router.get('/cities', verifyToken, async (req, res) => {
  const sql = 'SELECT DISTINCT location FROM events';
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

module.exports = router;
