const sgMail = require("@sendgrid/mail");

let isInitialized = false;

const initSendGrid = () => {
  if (isInitialized) return true;

  const apiKey = (process.env.SENDGRID_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY is not set. Email sending will be simulated.");
    return false;
  }

  if (!apiKey.startsWith("SG.")) {
    console.warn("SENDGRID_API_KEY does not look like a valid SendGrid key (expected prefix SG.). Email sending will fail.");
  }

  sgMail.setApiKey(apiKey);
  isInitialized = true;
  return true;
};

const sendEmailViaSendgrid = async (to, subject, text, html) => {
  const isReady = initSendGrid();
  
  if (isReady) {
    const from = (process.env.SENDGRID_FROM || "onboarding@relaychat.com").trim(); // Must be verified in SendGrid
    
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
      const status = error?.code || error?.response?.statusCode;
      console.error("SendGrid email delivery error:", {
        message: error?.message,
        status,
      });
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
