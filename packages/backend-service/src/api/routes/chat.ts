import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { chatWithComponent } from '../../services/ai/index.js';

const router: IRouter = Router();

// 请求验证 Schema
const chatRequestSchema = z.object({
  question: z.string().default(''), // 空字符串表示默认分析
  component: z.object({
    name: z.string().min(1, 'component name is required'),
    filePath: z.string().default(''),
    code: z.string().default(''),
  }),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
});

/**
 * POST /api/chat
 * 对话式组件分析
 */
router.post('/', async (req, res, next) => {
  try {
    // 验证请求
    const parseResult = chatRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new AppError(
        'INVALID_REQUEST',
        `Invalid request: ${errors.join(', ')}`,
        400,
        { validationErrors: parseResult.error.errors }
      );
    }

    const request = parseResult.data;
    logger.info('Chat request received', { 
      component: request.component.name,
      question: request.question || '(default analysis)',
      historyLength: request.history.length,
    });

    // 执行对话分析
    const response = await chatWithComponent(request);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
