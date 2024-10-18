const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  max: 20, // Jumlah maksimum koneksi simultan
  idleTimeoutMillis: 30000, // Waktu idle sebelum koneksi ditutup (30 detik)
  connectionTimeoutMillis: 2000, // Waktu timeout sebelum gagal koneksi (2 detik)
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
