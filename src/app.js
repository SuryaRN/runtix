require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const eventRoutes = require('./modules/events');
const registrationRoutes = require('./modules/registrations');
const paymentRoutes = require('./modules/payment');
const authRoutes = require('./modules/auth');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const certificateRoutes = require('./modules/certificates');
const organizerVerificationRoutes = require('./modules/organizerVerification');
app.set('trust proxy', 1); // Mengaktifkan trust proxy agar rate-limit bekerja dengan benar


// Rate limiting: maksimal 100 request per 15 menit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 request
  message: "Too many requests from this IP, please try again after 15 minutes"
});

app.use(limiter);
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined')); // Tambahkan logging request dengan Morgan

app.get('/', (req, res) => {
  res.send('Runtix API is running');
});

// Integrasi routes dengan otentikasi dan logging
app.use('/api', authRoutes);  // Route untuk otentikasi
app.use('/api', eventRoutes);
app.use('/api', registrationRoutes);
app.use('/api', paymentRoutes);
app.use('/api', certificateRoutes);  // Route untuk sertifikat
app.use('/api', organizerVerificationRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
