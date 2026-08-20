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

## 桌面版与 Windows 安装包

桌面版以透明、置顶的像素小猫为入口。左键点击小猫可打开或隐藏主界面，拖动可移动位置，右键可切换主题、预览动作或退出。

每次启动都会在 Electron 的用户数据目录下生成独立的完整运行日志，包含窗口加载、渲染器 console、IPC、宠物状态、主题切换和未捕获异常。右键小猫 → **打开运行日志** 可直接查看当前会话日志。

任务和番茄钟历史统一保存在一个数据目录下。`tasks.json` 与 `history.json` 是完整数据，`days/YYYY-MM-DD/` 下保存每天的 `tasks.json` 和 `history.json`。首次运行会自动迁移浏览器存储中的现有数据；右键小猫 → **打开数据文件夹** 可直接查看或备份，使用 **选择数据文件夹…** 可以更换位置。切换时会复制现有数据但不删除旧目录，并永久记住选择结果。

开发调试：

```bash
npm run electron:dev
```

在 Windows 上，从项目根目录双击 `build-windows.bat` 即可自动安装依赖并生成 x64 单文件绿色版。也可以在本目录运行：

```bash
npm run dist:win
```

绿色版输出到 `release/TimeManagementElf.exe`，无需安装，双击即可运行。应用使用单实例锁：再次启动只会唤醒现有主界面，不会创建第二个宠物或第二个应用实例。

小猫支持 `idle`、`focus`、`celebrate`、`play` 四种动画状态。自定义 GIF、APNG、WebP 或 PNG 主题的方法见 [`public/themes/README.md`](public/themes/README.md)。

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
