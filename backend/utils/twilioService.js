const twilio = require('twilio');
const logger = require('./logger');

let twilioClient = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      logger.error('Failed to initialize Twilio client:', err.message);
    }
  } else {
    logger.warn('Twilio credentials missing. SMS features are disabled.');
  }

  return twilioClient;
};

/**
 * Sends an SMS to the provider.
 * @param {string} toPhoneNumber - The provider's phone number.
 * @param {string} message - The SMS body.
 * @returns {Promise<boolean>} - True if successful.
 */
const sendProviderSMS = async (toPhoneNumber, message) => {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    logger.warn('Skipped sending SMS: Twilio not configured.');
    return false;
  }

  if (!toPhoneNumber) {
    logger.warn('Skipped sending SMS: Target phone number is missing.');
    return false;
  }

  try {
    const response = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toPhoneNumber
    });
    
    logger.info(`SMS successfully sent to ${toPhoneNumber}. SID: ${response.sid}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send SMS to ${toPhoneNumber}:`, err.message);
    return false;
  }
};

module.exports = {
  sendProviderSMS
};
