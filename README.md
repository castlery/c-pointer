# C-Pointer

当前仓库包含：

- 产品与架构文档
- Chrome 插件首版骨架
- 后端服务首版骨架

文档入口：

- [文档索引](docs/README.md)
- [产品需求文档（整合版）](docs/product-requirements.md)

当前目标：

- 重新定义一个可用于 Castlery Web 与 POS 测试环境的浏览器插件产品
- 统一产品目标、边界、核心概念与用户故事
- 在确认需求后，再重新讨论信息架构、技术方案与实现节奏

## 工程结构

- `packages/browser-extension`
- `packages/backend-service`
- `packages/shared`

## 本地运行

安装依赖：

```bash
pnpm install
```

启动后端：

```bash
cp packages/backend-service/.env.example packages/backend-service/.env
pnpm --filter @c-pointer/backend-service dev
```

构建插件：

```bash
pnpm --filter @c-pointer/browser-extension build
```

统一检查：

```bash
pnpm typecheck
pnpm build
```

## 当前实现范围

- 插件 Popup
- 页面内 Fortress 风格 Drawer 骨架
- 组件选择模式最小闭环
- 后端分析接口、追问接口、历史接口
- 内存版历史存储

## 当前限制

- 还未接入真实 GitHub 源码读取
- 还未接入真实 GPT 调用
- 会话存储目前仍是内存实现，下一阶段再替换为轻量数据库
