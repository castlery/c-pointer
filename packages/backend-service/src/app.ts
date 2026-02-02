import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './api/index.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { requestLogger } from './api/middleware/requestLogger.js';

const app: Express = express();

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: [
    /^chrome-extension:\/\//,
    /^http:\/\/localhost(:\d+)?$/,
    /^https?:\/\/.*\.castlery\.com$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID', 'X-Client-Version'],
  credentials: true
}));

// 解析 JSON
app.use(express.json());

// 请求日志
app.use(requestLogger);

// API 路由
app.use('/api', apiRouter);

// 根路径
app.get('/', (_req, res) => {
  res.json({
    name: 'Component Code Analyzer API',
    version: '1.0.0',
    docs: '/api/health'
  });
});

// 错误处理
app.use(errorHandler);

export default app;
