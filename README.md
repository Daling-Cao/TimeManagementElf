# 时间管理小精灵 (TimeManagementElf)

<div align="center">

🎯 一个现代化的时间管理和任务追踪 Web 应用

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

## ✨ 功能特性

### 📋 任务管理
- ✅ 创建、编辑、删除任务
- ✅ 任务状态管理（待办/进行中/已完成）
- ✅ 优先级标记（高/中/低）
- ✅ 任务类型分类
- ✅ 本地数据持久化

### 🍅 番茄钟计时器
- ✅ 可自定义时长（15/25/30/45/60分钟）
- ✅ 开始/暂停/继续/停止控制
- ✅ 实时进度条显示
- ✅ 完成提醒
- ✅ 会话历史记录

### 📊 数据统计
- ✅ 任务完成率统计
- ✅ 番茄钟会话统计
- ✅ 任务状态分布可视化
- ✅ 优先级分布分析
- ✅ 生产力洞察和建议

### 💾 数据管理
- ✅ LocalStorage 本地存储
- ✅ 数据持久化
- ✅ 自动保存
- ⏳ 后端同步（开发中）

## 🚀 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装和运行

#### 1. 克隆项目
```bash
git clone https://github.com/yourusername/TimeManagementElf.git
cd TimeManagementElf
```

#### 2. 前端设置
```bash
cd frontend
npm install
npm run dev
```
前端将在 http://localhost:5173 运行

#### 3. 后端设置（可选）
```bash
cd backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等

# 运行数据库迁移
npx prisma migrate dev

# 启动后端
npm run start:dev
```
后端将在 http://localhost:3000 运行

## 📁 项目结构

```
TimeManagementElf/
├── frontend/                 # React 前端应用
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面组件
│   │   ├── core/            # 核心逻辑
│   │   │   ├── services/    # API 和同步服务
│   │   │   ├── store/       # 状态管理
│   │   │   └── types/       # TypeScript 类型
│   │   ├── styles/          # 样式文件
│   │   └── App.tsx          # 应用入口
│   ├── public/              # 静态资源
│   └── package.json
│
├── backend/                  # NestJS 后端 API
│   ├── src/
│   │   ├── auth/            # 认证模块
│   │   ├── tasks/           # 任务模块
│   │   ├── tomato/          # 番茄钟模块
│   │   ├── prisma/          # Prisma 服务
│   │   └── main.ts          # 应用入口
│   ├── prisma/
│   │   └── schema.prisma    # 数据库模型
│   └── package.json
│
├── docs/                     # 文档
├── TESTING_GUIDE.md         # 测试指南
├── DEPLOYMENT_GUIDE.md      # 部署指南
└── README.md                # 本文件
```

## 🛠️ 技术栈

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **路由**: React Router v6
- **样式**: Pure CSS

### 后端
- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL / SQLite
- **ORM**: Prisma
- **认证**: JWT

## 📖 使用指南

### 任务管理
1. 在任务列表页面输入任务标题
2. 点击"添加任务"创建新任务
3. 勾选复选框标记任务完成
4. 使用下拉菜单更改任务状态
5. 点击"删除"按钮移除任务

### 番茄钟
1. 选择专注时长
2. 点击"开始专注"启动计时器
3. 专注期间可以暂停或停止
4. 计时结束会自动保存会话记录

### 统计查看
1. 访问统计页面查看数据概览
2. 查看任务完成情况
3. 查看番茄钟使用统计
4. 获取生产力建议

## 🧪 测试

详细的测试指南请参考 [TESTING_GUIDE.md](TESTING_GUIDE.md)

### 运行测试
```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
npm run test
```

## 🚢 部署

详细的部署指南请参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### 快速部署

#### 前端（Vercel）
```bash
cd frontend
npm run build
vercel --prod
```

#### 后端（Railway）
```bash
cd backend
railway up
```

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发计划

- [x] 任务管理基础功能
- [x] 番茄钟计时器
- [x] 数据统计和可视化
- [ ] 后端 API 集成
- [ ] 数据同步
- [ ] 离线支持
- [ ] 任务标签系统
- [ ] 任务搜索和筛选
- [ ] 数据导出功能
- [ ] 移动端适配优化
- [ ] 暗黑模式

## 🐛 已知问题

1. 统计页面的时间段筛选功能未完全实现
2. 后端同步功能暂时禁用
3. 任务类型固定，无法自定义

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

Your Name - [@yourhandle](https://github.com/yourhandle)

## 🙏 致谢

- React 团队提供的优秀框架
- NestJS 团队提供的后端框架
- Prisma 团队提供的 ORM 工具
- 所有开源贡献者

## 📞 联系方式

- 项目链接: [https://github.com/yourusername/TimeManagementElf](https://github.com/yourusername/TimeManagementElf)
- 问题反馈: [Issues](https://github.com/yourusername/TimeManagementElf/issues)

---

<div align="center">
Made with ❤️ by TimeManagementElf Team
</div>

