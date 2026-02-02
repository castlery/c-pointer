import { Router, type IRouter } from 'express';
import analyzeRouter from './routes/analyze.js';
import healthRouter from './routes/health.js';
import configRouter from './routes/config.js';
import githubRouter from './routes/github.js';
import chatRouter from './routes/chat.js';

const router: IRouter = Router();

router.use('/analyze', analyzeRouter);
router.use('/health', healthRouter);
router.use('/config', configRouter);
router.use('/github', githubRouter);
router.use('/chat', chatRouter);

export default router;
