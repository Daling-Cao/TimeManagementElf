# 时间管理小精灵 - 前端

基于 React + TypeScript + Vite 的时间管理 Web 应用。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **路由**: React Router v6
- **存储**: IndexedDB (idb 库)

## 项目结构

```
src/
├── core/                 # 核心功能
│   ├── store/           # 状态管理
│   ├── services/        # 服务层
│   ├── types/           # 类型定义
│   └── utils/           # 工具函数
├── components/          # 组件
│   ├── Tasks/          # 任务相关组件
│   ├── Tomato/         # 番茄钟组件
│   ├── Statistics/     # 统计组件
│   └── common/         # 通用组件
├── pages/              # 页面组件
├── styles/             # 样式文件
└── assets/             # 静态资源
```

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 环境变量

创建 `.env.local` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=时间管理小精灵
VITE_APP_VERSION=1.0.0
VITE_DEBUG=true
```

## 功能特性

- ✅ 任务列表管理（增删改查）
- ✅ 番茄钟计时器
- ✅ 离线数据存储
- ✅ 数据同步
- ✅ 统计面板
- ✅ 响应式设计

## 开发计划

- [x] 项目初始化和基础架构
- [ ] 任务列表模块
- [ ] 番茄钟模块
- [ ] 数据同步和离线支持
- [ ] 统计面板
- [ ] 测试和优化