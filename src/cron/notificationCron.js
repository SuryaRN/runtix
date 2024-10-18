const cron = require('node-cron');
const pool = require('../config/db');
const sendNotificationEmail = require('../utils/sendEmail');

cron.schedule('0 7 * * *', async () => {
  try {
    const result = await pool.query(`
      SELECT u.email, e.name AS event_name, e.date 
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      JOIN events e ON e.id = n.event_id
      WHERE e.date = CURRENT_DATE + INTERVAL '1 day' 
      AND n.notify_before_event = TRUE
    `);

    await Promise.all(result.rows.map(row =>
      sendNotificationEmail(row.email, 'Pengingat Event Besok', `Jangan lupa event ${row.event_name} besok!`)
    ));

    console.log('Notifikasi berhasil dikirim');
  } catch (err) {
    console.error('Gagal mengirim notifikasi:', err);
  }
});
