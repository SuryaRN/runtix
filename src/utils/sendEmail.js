const nodemailer = require('nodemailer');

const sendConfirmationEmail = (email, eventName, registrationId) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Registration Confirmation',
    text: `You have successfully registered for the event: ${eventName}. Your registration ID is ${registrationId}.`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

module.exports = sendConfirmationEmail;
