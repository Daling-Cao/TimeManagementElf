#!/bin/bash

# 时间管理小精灵 - 快速启动脚本

echo "🎯 时间管理小精灵 - 启动中..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 启动前端
echo "🚀 启动前端..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

echo "🌐 启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ 前端已启动！"
echo "📱 访问地址: http://localhost:5173"
echo ""
echo "💡 提示:"
echo "  - 按 Ctrl+C 停止服务"
echo "  - 前端进程 PID: $FRONTEND_PID"
echo ""
echo "🎉 启动完成！祝您使用愉快！"
echo ""

# 等待用户中断
wait $FRONTEND_PID

