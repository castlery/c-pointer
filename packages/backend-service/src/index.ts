import 'dotenv/config';
import app from './app.js';
import { logger } from './infrastructure/logging/logger.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  logger.info(`🚀 Server started`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`
  });
  logger.info(`📋 API endpoints:`, {
    health: `http://localhost:${PORT}/api/health`,
    analyze: `http://localhost:${PORT}/api/analyze`,
    config: `http://localhost:${PORT}/api/config`
  });
});
