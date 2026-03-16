const twilio = require('twilio');

let client;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (error) {
  console.error("Failed to initialize Twilio client:", error.message);
}

/**
 * Send an SMS message using Twilio.
 * 
 * @param {string} to - The recipient's phone number in E.164 format (e.g., +1234567890)
 * @param {string} body - The text content of the message
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const sendSms = async (to, body) => {
  if (!client) {
    console.error("Twilio client not initialized. Ensure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set in .env");
    return false;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.error("TWILIO_PHONE_NUMBER is not set in .env");
    return false;
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    console.log(`✅ SMS sent successfully to ${to}. SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendSms
};
