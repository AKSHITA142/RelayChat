const { Resend } = require("resend");

let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

const getResendFrom = () => {
  // Use a verified sender/domain in production.
  // `onboarding@resend.dev` is handy for local testing, but may not work for all recipients.
  return process.env.RESEND_FROM || "onboarding@resend.dev";
};

module.exports = {
  getResendClient,
  getResendFrom,
};

