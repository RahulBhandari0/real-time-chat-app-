const nodemailer = require('nodemailer');
const twilio = require('twilio');

async function sendWelcomeEmail(toEmail, username) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Real-Time Chat" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Welcome to Real-Time Chat App!',
      html: `<h2>Welcome ${username}!</h2><p>Your account has been created successfully. Enjoy messaging!</p>`
    });
  } catch (err) {
    console.error('Email sending failed (non-fatal):', err.message);
  }
}

async function sendSMSAlert(toPhone, message) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !fromPhone || !sid.startsWith('AC')) return;

    const client = twilio(sid, token);
    await client.messages.create({
      body: message,
      from: fromPhone,
      to: toPhone
    });
  } catch (err) {
    console.error('SMS sending failed (non-fatal):', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendSMSAlert };