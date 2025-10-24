# 测试指南

## 启动服务

### 1. 启动后端服务

```bash
cd backend
npm run start:dev
```

后端将在 `http://localhost:3000` 启动。

### 2. 启动前端服务

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动。

## 测试后端 API

### 健康检查

```bash
curl http://localhost:3000/api/health
```

### 注册用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "测试用户",
    "password": "password123"
  }'
```

### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

保存返回的 `access_token`，用于后续请求。

### 创建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "测试任务",
    "task_type": "工作",
    "priority": "HIGH",
    "tags": ["测试"],
    "estimate_minutes": 60
  }'
```

### 获取任务列表

```bash
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 更新任务

```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "更新后的任务",
    "status": "IN_PROGRESS",
    "version": 1
  }'
```

### 删除任务

```bash
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 测试前端功能

### 1. 访问应用

打开浏览器访问 `http://localhost:5173/tasks`

### 2. 测试功能

#### 离线模式测试
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 选择 "Offline" 模式
4. 尝试创建、更新、删除任务
5. 检查任务是否保存到本地 IndexedDB
6. 切换回 "Online" 模式
7. 观察任务是否自动同步到服务器

#### IndexedDB 检查
1. 打开浏览器开发者工具（F12）
2. 切换到 Application 标签
3. 在左侧菜单中找到 IndexedDB
4. 展开 TimeManagementElf 数据库
5. 查看 tasks、sync_queue 等存储

#### 网络请求监控
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 执行创建、更新、删除操作
4. 观察 API 请求和响应

## 常见问题

### 后端启动失败

1. 检查数据库是否正确配置
2. 运行 `npx prisma generate`
3. 运行 `npx prisma migrate dev`

### 前端无法连接后端

1. 确认后端服务正在运行
2. 检查 CORS 配置
3. 检查 API_BASE_URL 是否正确

### 认证失败

1. 确保先注册用户
2. 使用正确的 email 和 password 登录
3. 保存并使用返回的 access_token

## 数据同步测试场景

### 场景1：在线创建任务
1. 确保网络在线
2. 创建任务
3. 检查任务是否同时保存到 IndexedDB 和服务器

### 场景2：离线创建任务
1. 切换到离线模式
2. 创建任务
3. 检查任务是否保存到 IndexedDB 和 sync_queue
4. 切换回在线模式
5. 检查任务是否自动同步到服务器

### 场景3：冲突解决
1. 在两个浏览器标签页中打开应用
2. 在标签页1中更新任务
3. 在标签页2中更新同一任务
4. 观察冲突如何处理（Last-Write-Wins）

