# 开发环境和部署设计

## 本地开发环境配置

### 前置要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 20.x LTS | 运行时 |
| pnpm | 8.x | 包管理器 |
| Git | 2.x | 版本控制 |
| Docker | 24.x | 容器化（可选） |
| Chrome | 90+ | 浏览器插件开发 |

### 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd component-code-analyzer

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp packages/backend-service/.env.example packages/backend-service/.env
# 编辑 .env 文件，填入必要的配置

# 4. 启动后端服务
pnpm --filter backend-service dev

# 5. 启动浏览器插件开发
pnpm --filter browser-extension dev

# 6. 在 Chrome 中加载插件
# - 打开 chrome://extensions/
# - 启用"开发者模式"
# - 点击"加载已解压的扩展程序"
# - 选择 packages/browser-extension/dist 目录
```

### Monorepo 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// 根 package.json
{
  "name": "component-code-analyzer",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0"
  }
}
```

---

## Docker 开发环境

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/backend-service
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - GIT_REPO_URL=${GIT_REPO_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=debug
    volumes:
      - ./packages/backend-service/src:/app/src
      - ./repos:/app/repos
      - ./logs:/app/logs
    command: pnpm dev

volumes:
  repos:
  logs:
```

### Dockerfile.dev

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 安装 Git（用于克隆仓库）
RUN apk add --no-cache git openssh-client

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 复制源代码
COPY . .

EXPOSE 3001

CMD ["pnpm", "dev"]
```

### 使用 Docker 开发

```bash
# 启动开发环境
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止环境
docker-compose down
```

---

## CI/CD 流程

### GitHub Actions 工作流

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            packages/backend-service/dist
            packages/browser-extension/dist
```

### Docker 镜像构建

```yaml
# .github/workflows/docker.yml
name: Docker Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./packages/backend-service
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/component-analyzer:${{ github.ref_name }}
            ${{ secrets.REGISTRY_URL }}/component-analyzer:latest
```

---

## 部署方案

### Docker 部署

#### 生产 Dockerfile

```dockerfile
# packages/backend-service/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源代码并构建
COPY . .
RUN pnpm build

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 Git（运行时需要）
RUN apk add --no-cache git openssh-client

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/config ./config

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

#### 部署命令

```bash
# 构建镜像
docker build -t component-analyzer:latest ./packages/backend-service

# 运行容器
docker run -d \
  --name component-analyzer \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e GIT_REPO_URL=git@github.com:castlery/joyboy.git \
  -e OPENAI_API_KEY=sk-xxx \
  -v /path/to/repos:/app/repos \
  -v /path/to/logs:/app/logs \
  component-analyzer:latest
```

### AWS 部署（未来扩展）

#### ECS 任务定义

```json
{
  "family": "component-analyzer",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "xxx.dkr.ecr.region.amazonaws.com/component-analyzer:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3001" }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openai-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/component-analyzer",
          "awslogs-region": "region",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "cpu": "512",
  "memory": "1024"
}
```

---

## 浏览器插件发布

### Chrome Web Store 发布流程

1. **准备发布包**
   ```bash
   pnpm --filter browser-extension build
   cd packages/browser-extension/dist
   zip -r ../extension.zip .
   ```

2. **上传到 Chrome Web Store**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - 创建新项目或更新现有项目
   - 上传 extension.zip
   - 填写商店信息（描述、截图等）
   - 提交审核

3. **内部分发（企业）**
   - 使用 Chrome Enterprise 策略分发
   - 或通过内部网站提供 .crx 文件下载

---

## 监控和告警

### 健康检查

```bash
# 健康检查端点
curl http://localhost:3001/api/health

# 预期响应
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "git": { "status": "ok" },
    "ai": { "status": "ok", "provider": "openai" },
    "cache": { "status": "ok", "size": 42 }
  }
}
```

### Docker 健康检查

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1
```

### 日志收集

```yaml
# docker-compose.yml (生产)
services:
  backend:
    # ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 环境配置清单

### 开发环境

| 配置项 | 值 |
|--------|-----|
| NODE_ENV | development |
| LOG_LEVEL | debug |
| 后端端口 | 3001 |
| 缓存 TTL | 300 (5分钟) |

### 测试环境

| 配置项 | 值 |
|--------|-----|
| NODE_ENV | test |
| LOG_LEVEL | info |
| 后端端口 | 3001 |
| 缓存 TTL | 1800 (30分钟) |

### 生产环境

| 配置项 | 值 |
|--------|-----|
| NODE_ENV | production |
| LOG_LEVEL | warn |
| 后端端口 | 3001 |
| 缓存 TTL | 3600 (1小时) |

---

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| Git 克隆失败 | SSH 密钥未配置 | 检查 SSH 密钥权限 |
| AI 分析超时 | OpenAI API 响应慢 | 增加超时时间或重试 |
| 插件无法连接后端 | CORS 配置错误 | 检查 CORS 白名单 |
| 缓存未命中 | 代码有更新 | 正常行为，会重新分析 |

### 日志查看

```bash
# Docker 日志
docker logs -f component-analyzer

# 本地日志文件
tail -f logs/combined.log
tail -f logs/error.log
```
