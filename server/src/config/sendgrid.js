const sgMail = require("@sendgrid/mail");

let isInitialized = false;

const initSendGrid = () => {
  if (isInitialized) return true;

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY is not set. Email sending will be simulated.");
    return false;
  }

  sgMail.setApiKey(apiKey);
  isInitialized = true;
  return true;
};

const sendEmailViaSendgrid = async (to, subject, text, html) => {
  const isReady = initSendGrid();
  
  if (isReady) {
    const from = process.env.SENDGRID_FROM || "onboarding@relaychat.com"; // Must be verified in SendGrid
    
    const msg = {
      to,
      from,
      subject,
      text,
      html: html || text, // Fallback to text if html is not provided
    };
    
    try {
      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error("SendGrid email delivery error:", error);
      if (error.response) {
        console.error("SendGrid API Response:", error.response.body);
      }
      throw error;
    }
  } else {
    // Simulated fallback behavior
    console.log(`\n\n=== [SIMULATED SENDGRID OTP] ===`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    console.log(`==================================\n\n`);
    return true;
  }
};

module.exports = {
  sendEmailViaSendgrid,
};
