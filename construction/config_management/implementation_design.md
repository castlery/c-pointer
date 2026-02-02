# Config Management - 实现设计

## 概述

配置管理作为后端服务的一部分实现，不作为独立服务部署。主要负责：
- 项目配置的加载和验证
- 环境和分支的解析
- 凭证的安全管理

---

## 模块结构

```
packages/backend-service/src/infrastructure/config/
├── ConfigManager.ts           # 配置管理器
├── ConfigValidator.ts         # 配置验证器
├── EnvironmentResolver.ts     # 环境解析器
├── CredentialManager.ts       # 凭证管理器
├── types.ts                   # 类型定义
└── defaultConfig.ts           # 默认配置
```

---

## 配置文件格式

### 配置文件位置

```
packages/backend-service/
├── config/
│   ├── default.json           # 默认配置
│   ├── development.json       # 开发环境覆盖
│   └── production.json        # 生产环境覆盖
```

### 配置文件结构

```json
{
  "project": {
    "name": "joyboy",
    "gitRepository": "git@github.com:castlery/joyboy.git",
    "defaultBranch": "develop"
  },
  
  "environments": [
    {
      "name": "test",
      "domain": "test.castlery.com",
      "branch": "develop",
      "enabled": true
    },
    {
      "name": "uat",
      "domain": "uat.castlery.com",
      "branch": "release",
      "enabled": true
    },
    {
      "name": "local",
      "domain": "localhost",
      "branch": "develop",
      "enabled": true
    }
  ],
  
  "markets": [
    { "code": "US", "subdomain": "us", "enabled": true },
    { "code": "CA", "subdomain": "ca", "enabled": true },
    { "code": "AU", "subdomain": "au", "enabled": true },
    { "code": "UK", "subdomain": "uk", "enabled": true },
    { "code": "SG", "subdomain": "sg", "enabled": true }
  ],
  
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "maxTokens": 4000,
    "temperature": 0.3
  },
  
  "cache": {
    "enabled": true,
    "ttlSeconds": 3600,
    "maxSize": 1000
  },
  
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

---

## 配置管理器实现

### ConfigManager

```typescript
class ConfigManager {
  private config: ProjectConfig;
  private environmentResolver: EnvironmentResolver;
  
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
    this.environmentResolver = new EnvironmentResolver(this.config);
  }
  
  private loadConfig(): ProjectConfig {
    // 1. 加载默认配置
    const defaultConfig = require('./config/default.json');
    
    // 2. 加载环境特定配置
    const env = process.env.NODE_ENV || 'development';
    const envConfig = this.loadEnvConfig(env);
    
    // 3. 合并配置
    return deepMerge(defaultConfig, envConfig);
  }
  
  private validateConfig(): void {
    const validator = new ConfigValidator();
    const result = validator.validate(this.config);
    if (!result.valid) {
      throw new Error(`Invalid config: ${result.errors.join(', ')}`);
    }
  }
  
  getConfig(): ProjectConfig {
    return this.config;
  }
  
  resolveEnvironment(pageUrl: string): ResolvedEnvironment {
    return this.environmentResolver.resolve(pageUrl);
  }
  
  getGitConfig(): GitConfig {
    return {
      repository: this.config.project.gitRepository,
      defaultBranch: this.config.project.defaultBranch
    };
  }
  
  getAIConfig(): AIConfig {
    return this.config.ai;
  }
  
  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }
}
```

---

## 环境解析器实现

### EnvironmentResolver

```typescript
class EnvironmentResolver {
  private environments: EnvironmentConfig[];
  private markets: MarketConfig[];
  
  constructor(config: ProjectConfig) {
    this.environments = config.environments.filter(e => e.enabled);
    this.markets = config.markets.filter(m => m.enabled);
  }
  
  resolve(pageUrl: string): ResolvedEnvironment {
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
    // 本地环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return this.environments.find(e => e.name === 'local')!;
    }
    
    // 匹配域名
    for (const env of this.environments) {
      if (hostname.includes(env.domain)) {
        return env;
      }
    }
    
    // 默认返回测试环境
    return this.environments.find(e => e.name === 'test')!;
  }
  
  private resolveMarketFromUrl(url: URL): MarketConfig {
    const hostname = url.hostname;
    const pathname = url.pathname;
    
    // 通过子域名匹配 (us.test.castlery.com)
    for (const market of this.markets) {
      if (market.subdomain && hostname.startsWith(market.subdomain + '.')) {
        return market;
      }
    }
    
    // 通过路径匹配 (/us/products)
    for (const market of this.markets) {
      if (pathname.startsWith('/' + market.code.toLowerCase())) {
        return market;
      }
    }
    
    // 默认返回 US
    return this.markets.find(m => m.code === 'US')!;
  }
}
```

---

## 凭证管理器实现

### CredentialManager

```typescript
class CredentialManager {
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || this.generateKey();
  }
  
  // 从环境变量获取凭证（推荐方式）
  getCredential(key: string): string | null {
    const envKey = this.toEnvKey(key);
    return process.env[envKey] || null;
  }
  
  // 加密凭证（用于存储）
  encrypt(plaintext: string): EncryptedValue {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }
  
  // 解密凭证
  decrypt(encrypted: EncryptedValue): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(encrypted.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  private toEnvKey(key: string): string {
    // git_token -> GIT_TOKEN
    return key.toUpperCase().replace(/-/g, '_');
  }
  
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

---

## 配置验证器实现

### ConfigValidator

```typescript
class ConfigValidator {
  validate(config: ProjectConfig): ValidationResult {
    const errors: string[] = [];
    
    // 验证项目配置
    if (!config.project?.gitRepository) {
      errors.push('project.gitRepository is required');
    }
    
    // 验证环境配置
    if (!config.environments?.length) {
      errors.push('At least one environment is required');
    }
    
    const enabledEnvs = config.environments?.filter(e => e.enabled) || [];
    if (enabledEnvs.length === 0) {
      errors.push('At least one enabled environment is required');
    }
    
    // 验证市场配置
    if (!config.markets?.length) {
      errors.push('At least one market is required');
    }
    
    // 验证 AI 配置
    if (!config.ai?.provider) {
      errors.push('ai.provider is required');
    }
    
    if (!config.ai?.model) {
      errors.push('ai.model is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

---

## 环境变量

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| NODE_ENV | 运行环境 | development / production |
| PORT | 服务端口 | 3001 |
| GIT_REPO_URL | Git 仓库地址 | git@github.com:castlery/joyboy.git |
| OPENAI_API_KEY | OpenAI API 密钥 | sk-xxx |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| GIT_REPO_PATH | 本地仓库路径 | ./repos/joyboy |
| LOG_LEVEL | 日志级别 | info |
| CACHE_TTL | 缓存过期时间（秒） | 3600 |
| CONFIG_ENCRYPTION_KEY | 配置加密密钥 | 自动生成 |

### .env.example

```bash
# 运行环境
NODE_ENV=development
PORT=3001

# Git 配置
GIT_REPO_URL=git@github.com:castlery/joyboy.git
GIT_REPO_PATH=./repos/joyboy

# AI 配置
OPENAI_API_KEY=sk-your-api-key-here

# 日志配置
LOG_LEVEL=debug

# 缓存配置
CACHE_TTL=3600

# 安全配置
CONFIG_ENCRYPTION_KEY=your-32-byte-hex-key
```

---

## 配置加载流程

```
1. 应用启动
   └─▶ ConfigManager 初始化

2. 加载配置文件
   └─▶ 读取 config/default.json
   └─▶ 读取 config/{NODE_ENV}.json
   └─▶ 深度合并配置

3. 加载环境变量
   └─▶ 覆盖配置文件中的值
   └─▶ 加载敏感凭证

4. 验证配置
   └─▶ ConfigValidator.validate()
   └─▶ 验证失败则抛出错误

5. 初始化解析器
   └─▶ EnvironmentResolver 初始化
   └─▶ CredentialManager 初始化

6. 配置就绪
   └─▶ 其他服务可以获取配置
```

---

## 使用示例

```typescript
// 在应用启动时初始化
const configManager = new ConfigManager();

// 在 AnalysisService 中使用
class AnalysisService {
  constructor(private configManager: ConfigManager) {}
  
  async analyze(request: AnalyzeRequest) {
    // 解析环境
    const { environment, market, branch } = 
      this.configManager.resolveEnvironment(request.pageUrl);
    
    // 获取 Git 配置
    const gitConfig = this.configManager.getGitConfig();
    
    // 获取 AI 配置
    const aiConfig = this.configManager.getAIConfig();
    
    // ... 执行分析
  }
}
```
