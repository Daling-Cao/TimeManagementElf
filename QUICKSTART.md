# 快速启动指南

## 🚀 5分钟快速开始

### 前置要求
- Node.js (v18+)
- npm 或 yarn

### 1. 启动后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖（如果还没安装）
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移（如果还没运行）
npx prisma migrate dev --name init

# 启动开发服务器
npm run start:dev
```

✅ 后端将在 `http://localhost:3000` 启动

### 2. 启动前端服务

在新的终端窗口中：

```bash
# 进入前端目录
cd frontend

# 安装依赖（如果还没安装）
npm install

# 启动开发服务器
npm run dev
```

✅ 前端将在 `http://localhost:5173` 启动

### 3. 访问应用

打开浏览器访问：
- **任务列表页面**: http://localhost:5173/tasks
- **首页**: http://localhost:5173/

### 4. 首次使用

#### 注册用户（使用 API）

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "name": "演示用户",
    "password": "demo123456"
  }'
```

#### 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123456"
  }'
```

保存返回的 `access_token`，后续 API 请求需要用到。

### 5. 开始使用

1. **在线模式**：
   - 创建任务会立即同步到服务器
   - 数据同时保存在本地 IndexedDB
   - 顶部状态栏显示 "● 在线"

2. **离线模式测试**：
   - 打开浏览器开发者工具（F12）
   - 切换到 Network 标签
   - 选择 "Offline" 模式
   - 尝试创建/编辑任务
   - 数据会保存到本地并加入同步队列
   - 切换回 "Online" 模式后自动同步

## 🔍 验证功能

### 检查后端是否运行

```bash
curl http://localhost:3000/api/health
```

应该返回健康检查信息。

### 检查前端是否运行

访问 http://localhost:5173，应该看到首页。

### 检查数据同步

1. 在任务列表页面创建一个任务
2. 打开浏览器开发者工具（F12）
3. 切换到 Application 标签
4. 查看 IndexedDB → TimeManagementElf → tasks
5. 应该能看到刚创建的任务

## 🐛 故障排除

### 后端启动失败

```bash
# 重新生成 Prisma 客户端
npx prisma generate

# 重置数据库（会清空所有数据！）
npx prisma migrate reset

# 或者只运行迁移
npx prisma migrate dev
```

### 前端无法连接后端

1. 确认后端正在运行：`curl http://localhost:3000/api/health`
2. 检查控制台是否有 CORS 错误
3. 检查 API URL 配置是否正确

### 数据不同步

1. 检查浏览器控制台的错误信息
2. 确认已登录（有 access_token）
3. 查看 Network 标签的 API 请求
4. 检查 IndexedDB 中的 sync_queue

## 📚 更多信息

- 详细测试指南：参见 `TESTING.md`
- 实现总结：参见 `IMPLEMENTATION_SUMMARY.md`
- 开发文档：参见 `docs/开发文档-跨平台架构与任务列表扩展-v0.2.md`

## 💡 提示

- 第一次使用时，由于没有登录功能的 UI，需要通过 API 注册用户
- 可以使用浏览器的本地存储查看 `access_token`
- 离线模式下的操作会在恢复网络后自动同步
- 每30秒自动同步一次，也可以手动点击"同步"按钮

## 🎯 下一步

- [ ] 添加用户登录界面
- [ ] 实现番茄钟功能
- [ ] 添加统计图表
- [ ] 部署到生产环境

祝您使用愉快！ 🎉

