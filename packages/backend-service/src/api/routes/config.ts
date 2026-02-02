import { Router, type IRouter } from 'express';
import type { ConfigResponse } from '@component-analyzer/shared';
import { configManager } from '../../infrastructure/config/configManager.js';

const router: IRouter = Router();

router.get('/', (_req, res) => {
  const config = configManager.getConfig();

  const response: ConfigResponse = {
    environments: config.environments.map(env => ({
      name: env.name,
      domain: env.domain,
      enabled: env.enabled
    })),
    markets: config.markets.map(market => ({
      code: market.code,
      enabled: market.enabled
    })),
    features: {
      codeSnippets: true,
      dependencyGraph: true,
      export: true
    }
  };

  res.json(response);
});

export default router;
