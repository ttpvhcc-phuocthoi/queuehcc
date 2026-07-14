const dotenv = require('dotenv');

dotenv.config();

const port = Number(process.env.PORT || 3000);
const appBaseUrl = process.env.APP_BASE_URL || '';
const swaggerServerUrl = process.env.SWAGGER_SERVER_URL || appBaseUrl || '';
const corsOriginValue = process.env.CORS_ORIGIN || '';
const corsOrigins = corsOriginValue
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port,
  appBaseUrl,
  swaggerServerUrl,
  corsOriginValue,
  corsOrigins
};
