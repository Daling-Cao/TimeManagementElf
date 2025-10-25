@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🎯 时间管理小精灵 - 启动中...
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo.

REM 启动前端
echo 🚀 启动前端...
cd frontend

if not exist "node_modules" (
    echo 📦 安装前端依赖...
    call npm install
)

echo 🌐 启动前端开发服务器...
start "时间管理小精灵 - 前端" cmd /k "npm run dev"

cd ..

echo.
echo ✅ 前端已启动！
echo 📱 访问地址: http://localhost:5173
echo.
echo 💡 提示:
echo   - 关闭命令窗口即可停止服务
echo   - 前端运行在独立窗口中
echo.
echo 🎉 启动完成！祝您使用愉快！
echo.

pause

