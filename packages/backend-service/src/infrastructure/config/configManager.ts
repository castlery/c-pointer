import type { EnvironmentName, MarketCode } from '@component-analyzer/shared';

export interface EnvironmentConfig {
  name: EnvironmentName;
  domain: string;
  branch: string;
  enabled: boolean;
}

export interface MarketConfig {
  code: MarketCode;
  subdomain?: string;
  enabled: boolean;
}

export interface ProjectConfig {
  project: {
    name: string;
    gitRepository: string;
    defaultBranch: string;
  };
  environments: EnvironmentConfig[];
  markets: MarketConfig[];
  ai: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  };
}

export interface ResolvedEnvironment {
  environment: EnvironmentConfig;
  market: MarketConfig;
  branch: string;
}

// 默认配置
const defaultConfig: ProjectConfig = {
  project: {
    name: 'joyboy',
    gitRepository: process.env.GIT_REPO_URL || 'git@github.com:castlery/joyboy.git',
    defaultBranch: 'develop'
  },
  environments: [
    { name: 'test', domain: 'test.castlery.com', branch: 'develop', enabled: true },
    { name: 'uat', domain: 'uat.castlery.com', branch: 'release', enabled: true },
    { name: 'local', domain: 'localhost', branch: 'develop', enabled: true }
  ],
  markets: [
    { code: 'US', subdomain: 'us', enabled: true },
    { code: 'CA', subdomain: 'ca', enabled: true },
    { code: 'AU', subdomain: 'au', enabled: true },
    { code: 'UK', subdomain: 'uk', enabled: true },
    { code: 'SG', subdomain: 'sg', enabled: true }
  ],
  ai: {
    provider: process.env.AI_PROVIDER || 'ollama',
    model: process.env.AI_MODEL || 'qwen2.5-coder:7b',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3')
  },
  cache: {
    enabled: true,
    ttlSeconds: parseInt(process.env.CACHE_TTL || '3600', 10),
    maxSize: 1000
  }
};

export class ConfigManager {
  private config: ProjectConfig;

  constructor() {
    this.config = defaultConfig;
  }

  getConfig(): ProjectConfig {
    return this.config;
  }

  resolveEnvironment(pageUrl: string): ResolvedEnvironment {
    const url = new URL(pageUrl);
    const hostname = url.hostname;

    // 解析环境
    const environment = this.resolveEnvironmentFromHostname(hostname);

    // 解析市场
    const market = this.resolveMarketFromUrl(url);

    return {
      environment,
      market,
      branch: environment.branch
    };
  }

  private resolveEnvironmentFromHostname(hostname: string): EnvironmentConfig {
    const enabledEnvs = this.config.environments.filter(e => e.enabled);

    // 本地环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return enabledEnvs.find(e => e.name === 'local') || enabledEnvs[0];
    }

    // 匹配域名
    for (const env of enabledEnvs) {
      if (hostname.includes(env.domain)) {
        return env;
      }
    }

    // 默认返回测试环境
    return enabledEnvs.find(e => e.name === 'test') || enabledEnvs[0];
  }

  private resolveMarketFromUrl(url: URL): MarketConfig {
    const hostname = url.hostname;
    const pathname = url.pathname;
    const enabledMarkets = this.config.markets.filter(m => m.enabled);

    // 通过子域名匹配
    for (const market of enabledMarkets) {
      if (market.subdomain && hostname.startsWith(market.subdomain + '.')) {
        return market;
      }
    }

    // 通过路径匹配
    for (const market of enabledMarkets) {
      if (pathname.startsWith('/' + market.code.toLowerCase())) {
        return market;
      }
    }

    // 默认返回 US
    return enabledMarkets.find(m => m.code === 'US') || enabledMarkets[0];
  }

  getGitConfig() {
    return {
      repository: this.config.project.gitRepository,
      defaultBranch: this.config.project.defaultBranch
    };
  }

  getAIConfig() {
    return this.config.ai;
  }

  getCacheConfig() {
    return this.config.cache;
  }
}

export const configManager = new ConfigManager();
