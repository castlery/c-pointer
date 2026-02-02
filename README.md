# Component Code Analyzer

帮助产品经理和测试人员快速了解 React 组件实现细节的浏览器插件工具。

## 项目结构

```
├── packages/
│   ├── backend-service/    # 后端 API 服务
│   ├── browser-extension/  # Chrome 浏览器插件
│   └── shared/             # 共享类型定义
├── construction/           # 设计文档
└── inception/              # 需求文档
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm

# 安装所有依赖
pnpm install
```

### 配置 GitHub Token

要从 GitHub 获取真实组件代码，需要配置 GitHub Token：

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限：`repo` (Full control of private repositories)
4. 复制生成的 token

在 `packages/backend-service/.env` 中配置：

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=castlery
GITHUB_REPO=joyboy
```

### 启动后端服务

```bash
# 进入后端目录
cd packages/backend-service

# 复制环境变量配置
cp .env.example .env

# 启动开发服务器
pnpm dev
```

后端服务将在 http://localhost:3001 启动。

API 端点:
- `GET /api/health` - 健康检查
- `POST /api/analyze` - 组件分析
- `GET /api/config` - 获取配置

### 构建浏览器插件

```bash
# 进入插件目录
cd packages/browser-extension

# 构建插件
pnpm build
```

构建产物在 `dist/` 目录。

### 加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `packages/browser-extension/dist` 目录

### 开发模式

```bash
# 后端热重载
cd packages/backend-service
pnpm dev

# 插件开发模式 (需要在另一个终端)
cd packages/browser-extension
pnpm dev
```

## 使用说明

1. 确保后端服务已启动
2. 访问目标网站 (test.castlery.com 或 localhost)
3. 点击插件图标激活选择模式
4. 在页面上点击要分析的组件
5. 在侧边栏查看分析结果

## 配置

### 后端配置 (.env)

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```

### 插件配置

在插件 Popup 中可以配置:
- API 服务器地址
- 高亮颜色
- 其他选项

## 开发说明

### 技术栈

- **后端**: Express.js + TypeScript
- **插件**: React + Redux Toolkit + Vite
- **样式**: Tailwind CSS

### 目录说明

```
packages/backend-service/
├── src/
│   ├── api/           # API 路由和中间件
│   ├── services/      # 业务服务
│   └── infrastructure/# 基础设施 (缓存、日志等)

packages/browser-extension/
├── src/
│   ├── background/    # Service Worker
│   ├── content/       # Content Script
│   ├── panel/         # Side Panel UI
│   ├── popup/         # Popup UI
│   ├── store/         # Redux Store
│   └── services/      # API 客户端等
```

## 第一阶段功能

- [x] 组件选择和高亮
- [x] Mock 分析结果展示
- [x] 基础 API 服务
- [ ] 真实 AI 分析集成
- [ ] 代码仓库集成

## License

MIT
