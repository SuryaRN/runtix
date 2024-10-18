const midtransClient = require('midtrans-client');

let snap = new midtransClient.Snap({
  isProduction: process.env.IS_PRODUCTION === 'false',
  serverKey: process.env.MIDTRANS_SERVER_KEY,  // Gunakan server key yang sudah dalam format biasa
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = snap;
