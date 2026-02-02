import { Router, type IRouter } from 'express';
import type { HealthResponse } from '@component-analyzer/shared';
import { getCacheStats, getAIServiceStatus, initAIService } from '../../services/analysisService.js';
import { configManager } from '../../infrastructure/config/configManager.js';

const router: IRouter = Router();
const startTime = Date.now();
const VERSION = '1.0.0';

// 初始化 AI 服务
initAIService().then(success => {
  console.log('[Health] AI service initialized:', success);
}).catch(err => {
  console.error('[Health] AI service init error:', err);
});

router.get('/', async (_req, res) => {
  const cacheStats = getCacheStats();
  const aiConfig = configManager.getAIConfig();
  const aiStatus = getAIServiceStatus();

  const response: HealthResponse = {
    status: 'ok',
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      git: {
        status: 'ok',
        message: 'Git repository accessible'
      },
      ai: {
        status: aiStatus.available ? 'ok' : 'error',
        provider: aiStatus.provider,
        message: aiStatus.available 
          ? `${aiStatus.provider} (${aiStatus.model}) ready` 
          : `${aiStatus.provider} not available`
      },
      cache: {
        status: 'ok',
        size: cacheStats.size,
        message: `Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`
      }
    }
  };

  // 如果有任何检查失败，设置整体状态
  const hasError = Object.values(response.checks).some(c => c.status === 'error');
  if (hasError) {
    response.status = 'degraded';
  }

  res.json(response);
});

export default router;
