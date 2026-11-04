import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import PageErrorBoundary from './components/PageErrorBoundary';
import DailyPlanner from './components/DailyPlanner';
import TaskSearchDialog from './components/TaskSearchDialog';
import BreakOverlay from './components/BreakOverlay';
import SimpleTasksPage from './pages/SimpleTasksPage';
import SimpleTomatoPage from './pages/SimpleTomatoPage';
import StatisticsPage from './pages/StatisticsPage';
import PetThemesPage from './pages/PetThemesPage';
import { useTomatoStore } from './core/store/tomatoStore';
import { useBreakStore } from './core/store/breakStore';

function App() {
  // 不要订阅 timeRemaining：每秒倒计时会重绘整棵路由树，
  // 正在输入的中文 IME 组字会被打断（表现为任务标题无法输入）。
  const isRunning = useTomatoStore((s) => s.isRunning);
  const currentTaskTitle = useTomatoStore((s) => s.currentTask?.title);
  const isPaused = useTomatoStore((s) => s.isPaused);
  const onBreak = useBreakStore((s) => s.endsAt !== null);

  // 恢复持久化的计时器
  useEffect(() => {
    const { isRunning: running, isPaused } = useTomatoStore.getState();
    if (running && !isPaused) {
      useTomatoStore.getState().resume();
    }
  }, []);

  // 把番茄钟状态同步给桌面小猫（Electron）：运行时显示"专注(猫头)"。
  // 在纯网页环境下 window.petAPI 不存在，直接跳过。
  useEffect(() => {
    window.petAPI?.setFocus(isRunning, currentTaskTitle);
  }, [isRunning, currentTaskTitle]);

  // 暂停 / 休息也告诉小猫，主题可以为这两种时候设置单独的状态。
  useEffect(() => {
    window.petAPI?.setActivity(isRunning && isPaused, onBreak);
  }, [isRunning, isPaused, onBreak]);

  // 计时归零完成时触发"完成(挥旗)"，用 subscribe 避免整树每秒重绘。
  useEffect(() => {
    return useTomatoStore.subscribe((state, prev) => {
      if (prev.timeRemaining > 0 && state.timeRemaining === 0) {
        window.petAPI?.celebrate();
      }
    });
  }, []);

  // 添加网页关闭确认提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useTomatoStore.getState().isRunning) {
        e.preventDefault();
        e.returnValue = '番茄钟正在运行，确定要离开吗？';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <Router>
      <div className="App">
        <AppRoutes />
        {/* 全局弹层放在路由外，切页时不会被卸载 */}
        <BreakOverlay />
        <DailyPlanner />
        <TaskSearchDialog />
      </div>
    </Router>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // 小猫右键菜单（任务列表 / 番茄钟 / 统计）让主窗口跳到对应页面
  useEffect(() => window.appAPI?.onNavigate((route) => navigate(route)), [navigate]);

  // key 跟随路由：某页出错后切到别的页会重新挂载，不会一直停在错误页
  return (
    <PageErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<SimpleTasksPage />} />
        <Route path="/tomato" element={<SimpleTomatoPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/pet-themes" element={<PetThemesPage />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </PageErrorBoundary>
  );
}

export default App;