# Unit 3: 配置管理 (Config Management)

## 单元概述

配置管理单元负责管理项目配置、环境映射和系统设置。作为独立模块，为后端服务提供配置读取能力，支持多环境、多市场的灵活配置。

## 技术栈

- Node.js + TypeScript
- JSON/YAML 配置文件
- 环境变量管理

## 包含的用户故事

### Epic 6: 配置管理

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-6.2 | P0 | 配置 Git 仓库（配置存储部分） |
| US-6.3 | P1 | 配置环境分支映射 |

---

## 详细验收标准

### 配置数据模型

```typescript
interface ProjectConfig {
  // 项目基本信息
  projectName: string;
  gitRepository: string;
  gitCredentials?: EncryptedCredentials;
  
  // 环境配置
  environments: EnvironmentConfig[];
  
  // 市场配置
  markets: MarketConfig[];
  
  // AI 服务配置
  aiProvider: AIProviderConfig;
  
  // 缓存配置
  cache: CacheConfig;
}

interface EnvironmentConfig {
  name: 'test' | 'uat' | 'local';
  domain: string;
  branch: string;
  enabled: boolean;
}

interface MarketConfig {
  code: 'US' | 'CA' | 'AU' | 'UK' | 'SG';
  subdomain?: string;
  pathPrefix?: string;
  enabled: boolean;
}

interface AIProviderConfig {
  provider: 'openai' | 'claude' | 'azure';
  apiKey: EncryptedString;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
}
```

---

## 默认配置

```json
{
  "projectName": "joyboy",
  "gitRepository": "git@github.com:castlery/joyboy.git",
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
      "domain": "localhost:3000",
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
  "aiProvider": {
    "provider": "openai",
    "model": "gpt-4",
    "maxTokens": 4000,
    "temperature": 0.3
  },
  "cache": {
    "enabled": true,
    "ttlSeconds": 3600,
    "maxSize": 1000
  }
}
```

---

## 模块结构

```
config-management/
├── src/
│   ├── ConfigManager.ts        # 配置管理器
│   ├── ConfigValidator.ts      # 配置验证
│   ├── EnvironmentResolver.ts  # 环境解析
│   ├── CredentialManager.ts    # 凭证管理
│   └── types.ts                # 类型定义
├── config/
│   ├── default.json            # 默认配置
│   └── schema.json             # 配置 Schema
└── package.json
```

---

## 配置管理接口

```typescript
interface ConfigManager {
  // 获取完整配置
  getConfig(): ProjectConfig;
  
  // 更新配置
  updateConfig(partial: Partial<ProjectConfig>): void;
  
  // 根据 URL 解析环境
  resolveEnvironment(pageUrl: string): EnvironmentConfig | null;
  
  // 根据 URL 解析市场
  resolveMarket(pageUrl: string): MarketConfig | null;
  
  // 获取对应分支
  getBranch(environment: string): string;
  
  // 验证配置
  validateConfig(config: ProjectConfig): ValidationResult;
}
```

---

## 环境解析逻辑

```typescript
class EnvironmentResolver {
  resolveEnvironment(pageUrl: string): EnvironmentConfig | null {
    const url = new URL(pageUrl);
    const hostname = url.hostname;
    
    // 匹配环境
    for (const env of this.config.environments) {
      if (hostname.includes(env.domain) || hostname === env.domain) {
        return env;
      }
    }
    
    // 本地开发环境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return this.config.environments.find(e => e.name === 'local');
    }
    
    return null;
  }
  
  resolveMarket(pageUrl: string): MarketConfig | null {
    const url = new URL(pageUrl);
    const hostname = url.hostname;
    const pathname = url.pathname;
    
    // 通过子域名匹配
    for (const market of this.config.markets) {
      if (market.subdomain && hostname.startsWith(market.subdomain)) {
        return market;
      }
    }
    
    // 通过路径前缀匹配
    for (const market of this.config.markets) {
      if (market.pathPrefix && pathname.startsWith(market.pathPrefix)) {
        return market;
      }
    }
    
    // 默认返回 US
    return this.config.markets.find(m => m.code === 'US');
  }
}
```

---

## 凭证安全管理

```typescript
interface CredentialManager {
  // 加密存储凭证
  storeCredential(key: string, value: string): void;
  
  // 获取解密后的凭证
  getCredential(key: string): string | null;
  
  // 删除凭证
  deleteCredential(key: string): void;
  
  // 验证凭证有效性
  validateCredential(key: string): boolean;
}

// 使用 AES-256 加密
class AESCredentialManager implements CredentialManager {
  private encryptionKey: string;
  
  constructor() {
    // 从环境变量获取加密密钥
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
  }
  
  storeCredential(key: string, value: string): void {
    const encrypted = this.encrypt(value);
    // 存储到配置文件或数据库
  }
  
  getCredential(key: string): string | null {
    const encrypted = this.loadEncrypted(key);
    return encrypted ? this.decrypt(encrypted) : null;
  }
}
```

---

## 依赖关系

- **被 Unit 2 (后端服务) 依赖**: 提供配置读取
- **无其他依赖**

---

## 开发里程碑

| 里程碑 | 包含功能 | 预计工时 |
|-------|---------|---------|
| M1 | 配置数据模型 + 验证 | 1 天 |
| M2 | 环境/市场解析 | 0.5 天 |
| M3 | 凭证安全管理 | 0.5 天 |
