# Config Management - 领域模型设计

## 限界上下文

**上下文名称**: Config Management Context (配置管理上下文)

**职责**: 负责项目配置、环境映射和凭证管理

**与其他上下文的关系**:
- 上游供应商，为 Code Analysis Context 提供配置服务

---

## 聚合 (Aggregates)

### 聚合 1: ProjectConfig (项目配置)

**聚合根**: ProjectConfig

**职责**: 管理项目的完整配置，包括 Git 仓库、环境、市场和 AI 服务配置

**不变量 (Invariants)**:
- 项目必须有有效的 Git 仓库地址
- 至少配置一个启用的环境
- 至少配置一个启用的市场
- AI 服务配置必须完整

#### 实体 (Entities)

**ProjectConfig**
| 属性 | 类型 | 说明 |
|------|------|------|
| configId | ConfigId | 配置唯一标识 |
| projectName | ProjectName | 项目名称 |
| gitRepository | GitRepositoryConfig | Git 仓库配置 |
| environments | EnvironmentConfig[] | 环境配置列表 |
| markets | MarketConfig[] | 市场配置列表 |
| aiProvider | AIProviderConfig | AI 服务配置 |
| cacheConfig | CacheConfig | 缓存配置 |
| version | ConfigVersion | 配置版本 |
| updatedAt | Timestamp | 更新时间 |

**行为**:
- updateGitRepository(config): 更新 Git 仓库配置
- addEnvironment(env): 添加环境配置
- updateEnvironment(env): 更新环境配置
- removeEnvironment(envName): 移除环境配置
- addMarket(market): 添加市场配置
- updateMarket(market): 更新市场配置
- removeMarket(marketCode): 移除市场配置
- updateAIProvider(config): 更新 AI 服务配置
- validate(): 验证配置完整性

---

### 聚合 2: Credential (凭证)

**聚合根**: Credential

**职责**: 管理敏感凭证的安全存储

**不变量 (Invariants)**:
- 凭证必须加密存储
- 凭证访问必须经过验证

#### 实体 (Entities)

**Credential**
| 属性 | 类型 | 说明 |
|------|------|------|
| credentialId | CredentialId | 凭证标识 |
| key | CredentialKey | 凭证键名 |
| encryptedValue | EncryptedValue | 加密后的值 |
| type | CredentialType | 凭证类型 |
| createdAt | Timestamp | 创建时间 |
| expiresAt | Timestamp | 过期时间 |

**行为**:
- encrypt(value): 加密凭证值
- decrypt(): 解密凭证值
- isExpired(): 检查是否过期
- rotate(newValue): 轮换凭证

---

## 值对象 (Value Objects)

### ConfigId
配置唯一标识符
| 属性 | 类型 |
|------|------|
| value | UUID |

### ProjectName
项目名称
| 属性 | 类型 |
|------|------|
| value | string |

### ConfigVersion
配置版本
| 属性 | 类型 |
|------|------|
| major | number |
| minor | number |
| patch | number |

### GitRepositoryConfig
Git 仓库配置
| 属性 | 类型 | 说明 |
|------|------|------|
| url | RepositoryUrl | 仓库地址 |
| credentialKey | CredentialKey | 凭证键名 |
| defaultBranch | BranchName | 默认分支 |

### RepositoryUrl
仓库地址
| 属性 | 类型 |
|------|------|
| value | string |
| protocol | RepositoryProtocol |

### RepositoryProtocol
仓库协议枚举
| 值 |
|----|
| SSH |
| HTTPS |

### EnvironmentConfig
环境配置
| 属性 | 类型 | 说明 |
|------|------|------|
| name | EnvironmentName | 环境名称 |
| domain | Domain | 域名 |
| branch | BranchName | 对应分支 |
| enabled | boolean | 是否启用 |

### EnvironmentName
环境名称枚举
| 值 | 说明 |
|----|------|
| TEST | 测试环境 |
| UAT | UAT 环境 |
| LOCAL | 本地环境 |

### Domain
域名
| 属性 | 类型 |
|------|------|
| value | string |

### BranchName
分支名称
| 属性 | 类型 |
|------|------|
| value | string |

### MarketConfig
市场配置
| 属性 | 类型 | 说明 |
|------|------|------|
| code | MarketCode | 市场代码 |
| subdomain | Subdomain | 子域名 |
| pathPrefix | PathPrefix | 路径前缀 |
| enabled | boolean | 是否启用 |

### MarketCode
市场代码枚举
| 值 |
|----|
| US |
| CA |
| AU |
| UK |
| SG |

### Subdomain
子域名
| 属性 | 类型 |
|------|------|
| value | string |

### PathPrefix
路径前缀
| 属性 | 类型 |
|------|------|
| value | string |

### AIProviderConfig
AI 服务配置
| 属性 | 类型 | 说明 |
|------|------|------|
| provider | AIProviderName | 提供商名称 |
| apiKeyCredential | CredentialKey | API Key 凭证键 |
| model | ModelName | 模型名称 |
| maxTokens | number | 最大 Token 数 |
| temperature | number | 温度参数 |

### AIProviderName
AI 提供商名称枚举
| 值 |
|----|
| OPENAI |
| CLAUDE |
| AZURE_OPENAI |

### ModelName
模型名称
| 属性 | 类型 |
|------|------|
| value | string |

### CacheConfig
缓存配置
| 属性 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 是否启用 |
| ttlSeconds | number | 过期时间（秒） |
| maxSize | number | 最大缓存数量 |

### CredentialId
凭证标识符
| 属性 | 类型 |
|------|------|
| value | UUID |

### CredentialKey
凭证键名
| 属性 | 类型 |
|------|------|
| value | string |

### EncryptedValue
加密值
| 属性 | 类型 |
|------|------|
| ciphertext | string |
| iv | string |
| algorithm | EncryptionAlgorithm |

### EncryptionAlgorithm
加密算法枚举
| 值 |
|----|
| AES_256_GCM |

### CredentialType
凭证类型枚举
| 值 | 说明 |
|----|------|
| GIT_SSH_KEY | Git SSH 密钥 |
| GIT_TOKEN | Git 访问令牌 |
| AI_API_KEY | AI API 密钥 |

---

## 领域事件 (Domain Events)

### ConfigCreated
配置创建事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| projectName | ProjectName |
| createdAt | Timestamp |

### ConfigUpdated
配置更新事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| changedFields | string[] |
| newVersion | ConfigVersion |
| updatedAt | Timestamp |

### GitRepositoryConfigChanged
Git 仓库配置变更事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| oldUrl | RepositoryUrl |
| newUrl | RepositoryUrl |
| changedAt | Timestamp |

### EnvironmentAdded
环境添加事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| environment | EnvironmentConfig |
| addedAt | Timestamp |

### EnvironmentUpdated
环境更新事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| environmentName | EnvironmentName |
| changes | object |
| updatedAt | Timestamp |

### EnvironmentRemoved
环境移除事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| environmentName | EnvironmentName |
| removedAt | Timestamp |

### MarketAdded
市场添加事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| market | MarketConfig |
| addedAt | Timestamp |

### MarketUpdated
市场更新事件
| 属性 | 类型 |
|------|------|
| configId | ConfigId |
| marketCode | MarketCode |
| changes | object |
| updatedAt | Timestamp |

### CredentialStored
凭证存储事件
| 属性 | 类型 |
|------|------|
| credentialId | CredentialId |
| key | CredentialKey |
| type | CredentialType |
| storedAt | Timestamp |

### CredentialRotated
凭证轮换事件
| 属性 | 类型 |
|------|------|
| credentialId | CredentialId |
| key | CredentialKey |
| rotatedAt | Timestamp |

### CredentialExpired
凭证过期事件
| 属性 | 类型 |
|------|------|
| credentialId | CredentialId |
| key | CredentialKey |
| expiredAt | Timestamp |

---

## 领域服务 (Domain Services)

### EnvironmentResolverService
环境解析服务

**职责**: 根据页面 URL 解析对应的环境和分支

**接口**:
- resolveEnvironment(pageUrl: URL): EnvironmentConfig
- resolveMarket(pageUrl: URL): MarketConfig
- resolveBranch(pageUrl: URL): BranchName
- resolveAll(pageUrl: URL): ResolvedContext

### ConfigValidatorService
配置验证服务

**职责**: 验证配置的完整性和有效性

**接口**:
- validate(config: ProjectConfig): ValidationResult
- validateGitRepository(config: GitRepositoryConfig): ValidationResult
- validateEnvironment(config: EnvironmentConfig): ValidationResult
- validateAIProvider(config: AIProviderConfig): ValidationResult

### CredentialEncryptionService
凭证加密服务

**职责**: 管理凭证的加密和解密

**接口**:
- encrypt(plaintext: string): EncryptedValue
- decrypt(encrypted: EncryptedValue): string
- generateKey(): EncryptionKey
- rotateKey(oldKey: EncryptionKey, newKey: EncryptionKey): void

### GitConnectionValidatorService
Git 连接验证服务

**职责**: 验证 Git 仓库连接的有效性

**接口**:
- validateConnection(config: GitRepositoryConfig, credential: Credential): ConnectionStatus
- testBranch(branch: BranchName): boolean

---

## 存储库 (Repositories)

### ProjectConfigRepository
项目配置存储库

**职责**: 管理项目配置的持久化

**接口**:
- save(config: ProjectConfig): void
- load(): ProjectConfig
- getVersion(): ConfigVersion
- backup(): void
- restore(version: ConfigVersion): void

### CredentialRepository
凭证存储库

**职责**: 管理凭证的安全存储

**接口**:
- store(credential: Credential): void
- retrieve(key: CredentialKey): Credential
- delete(key: CredentialKey): void
- exists(key: CredentialKey): boolean
- listKeys(): CredentialKey[]

---

## 上下文映射 (Context Map)

```
┌─────────────────────────────────────────────────────────────┐
│              Config Management Context                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ProjectConfig                       │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │   │
│  │  │    Git    │  │Environment│  │    Market     │   │   │
│  │  │  Config   │  │  Config   │  │    Config     │   │   │
│  │  └───────────┘  └───────────┘  └───────────────┘   │   │
│  │                                                     │   │
│  │  ┌───────────┐  ┌───────────┐                      │   │
│  │  │    AI     │  │   Cache   │                      │   │
│  │  │  Config   │  │   Config  │                      │   │
│  │  └───────────┘  └───────────┘                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Credential                         │   │
│  │  (Encrypted Storage)                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Supplier
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Code Analysis Context                       │
│                    (Backend Service)                         │
└─────────────────────────────────────────────────────────────┘
```

**关系类型**: Supplier (供应商)
- Config Management 是上游供应商
- Code Analysis 是下游客户
- 通过内部模块接口提供配置

---

## 默认配置值

| 配置项 | 默认值 |
|-------|-------|
| projectName | joyboy |
| gitRepository.url | git@github.com:castlery/joyboy.git |
| gitRepository.defaultBranch | develop |
| environments[0] | { name: TEST, domain: test.castlery.com, branch: develop } |
| environments[1] | { name: UAT, domain: uat.castlery.com, branch: release } |
| environments[2] | { name: LOCAL, domain: localhost:3000, branch: develop } |
| markets | US, CA, AU, UK, SG (all enabled) |
| aiProvider.provider | OPENAI |
| aiProvider.model | gpt-4 |
| aiProvider.maxTokens | 4000 |
| aiProvider.temperature | 0.3 |
| cache.enabled | true |
| cache.ttlSeconds | 3600 |
| cache.maxSize | 1000 |
