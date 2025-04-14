// 📁 utils/sendAnonymousMessageEmail.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendAnonymousMessageEmail = async ({ to, subject, message, threadId, isPoster }) => {
  const link = `${process.env.FRONTEND_URL}/messages/thread/${threadId}`;

  const html = isPoster
    ? `
      <p>You've received a new message on your listing:</p>
      <blockquote>${message}</blockquote>
      <p><a href="${link}" target="_blank">👉 Reply to the message</a></p>
    `
    : `
      <p>You’ve received a reply from the property poster:</p>
      <blockquote>${message}</blockquote>
      <p><a href="${link}" target="_blank">👉 View and respond</a></p>
    `;

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✉️ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error.response?.body || error);
  }
};

module.exports = sendAnonymousMessageEmail;
