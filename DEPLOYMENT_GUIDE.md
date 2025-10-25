# 时间管理小精灵 - 部署指南

## 📦 部署准备

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- Git

## 🚀 前端部署

### 方案 1: Vercel（推荐）

#### 步骤
1. **安装 Vercel CLI**
```bash
npm install -g vercel
```

2. **构建前端**
```bash
cd frontend
npm run build
```

3. **部署到 Vercel**
```bash
vercel --prod
```

4. **配置环境变量**（如果需要连接后端）
在 Vercel 项目设置中添加：
```
VITE_API_URL=https://your-backend-api.com
```

#### 自动部署
1. 在 GitHub 上创建仓库
2. 推送代码到 GitHub
3. 在 Vercel 网站上导入 GitHub 仓库
4. Vercel 会自动检测 Vite 项目并部署
5. 每次推送到 main 分支会自动重新部署

### 方案 2: Netlify

#### 步骤
1. **构建前端**
```bash
cd frontend
npm run build
```

2. **安装 Netlify CLI**
```bash
npm install -g netlify-cli
```

3. **部署**
```bash
netlify deploy --prod --dir=dist
```

#### 配置文件
在 `frontend` 目录创建 `netlify.toml`：
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 方案 3: GitHub Pages

#### 步骤
1. **修改 vite.config.ts**
```typescript
export default defineConfig({
  base: '/TimeManagementElf/', // 你的仓库名
  // ... 其他配置
})
```

2. **构建**
```bash
cd frontend
npm run build
```

3. **部署脚本**
创建 `frontend/deploy.sh`：
```bash
#!/usr/bin/env sh
set -e
npm run build
cd dist
git init
git add -A
git commit -m 'deploy'
git push -f git@github.com:yourusername/TimeManagementElf.git master:gh-pages
cd -
```

4. **执行部署**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 方案 4: 传统服务器（Nginx）

#### 步骤
1. **构建前端**
```bash
cd frontend
npm run build
```

2. **上传 dist 目录到服务器**
```bash
scp -r dist/* user@your-server:/var/www/time-management-elf/
```

3. **配置 Nginx**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/time-management-elf;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

4. **重启 Nginx**
```bash
sudo systemctl restart nginx
```

## 🔧 后端部署

### 方案 1: Railway

#### 步骤
1. **创建 Railway 账号** https://railway.app
2. **安装 Railway CLI**
```bash
npm install -g @railway/cli
```

3. **登录**
```bash
railway login
```

4. **初始化项目**
```bash
cd backend
railway init
```

5. **添加 PostgreSQL 数据库**
```bash
railway add postgresql
```

6. **设置环境变量**
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-super-secret-key
railway variables set JWT_REFRESH_SECRET=your-refresh-secret-key
```

7. **部署**
```bash
railway up
```

### 方案 2: Heroku

#### 步骤
1. **创建 Heroku 应用**
```bash
cd backend
heroku create time-management-elf-api
```

2. **添加 PostgreSQL**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. **设置环境变量**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-key
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret-key
```

4. **创建 Procfile**
```
web: npm run start:prod
```

5. **部署**
```bash
git push heroku main
```

6. **运行数据库迁移**
```bash
heroku run npx prisma migrate deploy
```

### 方案 3: Docker + VPS

#### Dockerfile
在 `backend` 目录创建 `Dockerfile`：
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

#### docker-compose.yml
在项目根目录创建：
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/timemanagement
      - JWT_SECRET=your-super-secret-key
      - JWT_REFRESH_SECRET=your-refresh-secret-key
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=timemanagement
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### 部署步骤
```bash
# 构建并启动
docker-compose up -d

# 运行数据库迁移
docker-compose exec backend npx prisma migrate deploy
```

## 🔐 安全配置

### 环境变量
确保以下环境变量在生产环境中设置：

**后端**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-very-secure-random-string-at-least-32-chars
JWT_REFRESH_SECRET=another-very-secure-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

**前端**
```env
VITE_API_URL=https://your-backend-api.com
```

### CORS 配置
在 `backend/src/main.ts` 中：
```typescript
app.enableCors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true,
});
```

### HTTPS
- 使用 Let's Encrypt 免费 SSL 证书
- 或使用云服务商提供的 SSL 证书
- 确保所有请求都通过 HTTPS

## 📊 监控和日志

### 前端监控
- 使用 Sentry 进行错误追踪
- 使用 Google Analytics 进行用户行为分析

### 后端监控
- 使用 PM2 进行进程管理
- 使用 Winston 进行日志记录
- 使用 Prometheus + Grafana 进行性能监控

## 🔄 CI/CD

### GitHub Actions 示例

创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Deploy to Railway
        run: |
          cd backend
          npm ci
          npx railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## ✅ 部署检查清单

### 部署前
- [ ] 所有测试通过
- [ ] 代码已提交到 Git
- [ ] 环境变量已配置
- [ ] 数据库迁移脚本准备好
- [ ] 构建成功无错误

### 部署后
- [ ] 前端可以正常访问
- [ ] 后端 API 正常响应
- [ ] 数据库连接正常
- [ ] 所有功能正常工作
- [ ] HTTPS 配置正确
- [ ] CORS 配置正确
- [ ] 监控和日志正常

## 🆘 故障排查

### 前端问题
1. **页面空白**
   - 检查浏览器控制台错误
   - 检查 API 地址配置
   - 检查路由配置

2. **API 请求失败**
   - 检查 CORS 配置
   - 检查 API URL 环境变量
   - 检查网络请求

### 后端问题
1. **数据库连接失败**
   - 检查 DATABASE_URL 环境变量
   - 检查数据库服务是否运行
   - 检查防火墙规则

2. **JWT 认证失败**
   - 检查 JWT_SECRET 环境变量
   - 检查 token 过期时间
   - 检查 CORS credentials 配置

## 📚 相关资源

- [Vite 部署文档](https://vitejs.dev/guide/static-deploy.html)
- [NestJS 部署文档](https://docs.nestjs.com/faq/serverless)
- [Prisma 部署文档](https://www.prisma.io/docs/guides/deployment)
- [Vercel 文档](https://vercel.com/docs)
- [Railway 文档](https://docs.railway.app/)

