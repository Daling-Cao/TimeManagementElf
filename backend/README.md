# 时间管理小精灵 - 后端 API

基于 NestJS + Prisma + PostgreSQL 的时间管理应用后端服务。

## 技术栈

- **框架**: NestJS
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: JWT
- **验证**: class-validator
- **语言**: TypeScript

## 项目结构

```
src/
├── auth/              # 认证模块
├── users/             # 用户模块
├── tasks/             # 任务模块
├── tomatoes/          # 番茄钟模块
├── statistics/        # 统计模块
├── prisma/            # 数据库服务
├── common/            # 通用 DTO
└── config/            # 配置文件
```

## 环境变量

创建 `.env` 文件：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/timemanagementelf?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# App
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"
```

## 开发

### 安装依赖

```bash
npm install
```

### 数据库设置

1. 安装 PostgreSQL
2. 创建数据库
3. 运行数据库迁移：

```bash
npx prisma migrate dev
```

### 启动开发服务器

```bash
npm run start:dev
```

### 生成 Prisma 客户端

```bash
npx prisma generate
```

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌

### 任务
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/:id` - 获取单个任务
- `PATCH /api/tasks/:id` - 更新任务
- `PATCH /api/tasks/:id/complete` - 完成任务
- `DELETE /api/tasks/:id` - 删除任务

### 番茄钟
- `GET /api/tomatoes` - 获取番茄钟会话
- `POST /api/tomatoes` - 创建番茄钟会话
- `GET /api/tomatoes/statistics` - 获取番茄钟统计

### 统计
- `GET /api/statistics/tasks` - 任务统计
- `GET /api/statistics/tomato-sessions` - 番茄钟统计
- `GET /api/statistics/summary` - 综合统计

## 数据库模型

### User
- user_id (UUID, PK)
- email (String, Unique)
- name (String)
- password (String, Hashed)
- created_at, updated_at

### Task
- task_id (UUID, PK)
- user_id (UUID, FK)
- title, task_type, priority
- tags (JSON)
- estimate_minutes
- status, completed_at
- stats_focus_minutes, stats_actual_minutes, stats_sessions_count
- version (for conflict resolution)

### TomatoSession
- session_id (UUID, PK)
- user_id (UUID, FK)
- task_id (UUID, FK, Optional)
- task_type, planned_minutes, actual_minutes
- started_at, ended_at, status
- interruption_reason

## 功能特性

- ✅ JWT 认证和授权
- ✅ 任务 CRUD 操作
- ✅ 番茄钟会话记录
- ✅ 数据统计和分析
- ✅ 版本冲突检测
- ✅ 数据验证
- ✅ CORS 支持