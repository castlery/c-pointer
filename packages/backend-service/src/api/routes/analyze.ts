import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { analyzeComponent } from '../../services/analysisService.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../../infrastructure/logging/logger.js';

const router: IRouter = Router();

// 请求验证 Schema
const analyzeRequestSchema = z.object({
  componentInfo: z.object({
    displayName: z.string().min(1, 'displayName is required'),
    fileName: z.string().min(1, 'fileName is required'),
    filePath: z.string().nullable(),
    componentType: z.enum(['fortress', 'business', 'shared', 'unknown']),
    props: z.record(z.unknown()).optional()
  }),
  environment: z.enum(['test', 'uat', 'local']),
  market: z.enum(['US', 'CA', 'AU', 'UK', 'SG']),
  pageUrl: z.string().url('Invalid page URL'),
  options: z.object({
    includeCodeSnippets: z.boolean().optional(),
    maxDepth: z.number().optional()
  }).optional()
});

router.post('/', async (req, res, next) => {
  try {
    // 验证请求
    const parseResult = analyzeRequestSchema.safeParse(req.body);
    
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
    logger.debug('Validated analyze request', { 
      component: request.componentInfo.displayName 
    });

    // 执行分析
    const response = await analyzeComponent(request);

    // 设置响应时间头
    res.setHeader('X-Response-Time', `${response.meta.duration}ms`);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
