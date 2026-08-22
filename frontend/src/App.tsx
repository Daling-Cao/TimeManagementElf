import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleHomePage from './pages/SimpleHomePage';
import SimpleTasksPage from './pages/SimpleTasksPage';
import SimpleTomatoPage from './pages/SimpleTomatoPage';
import StatisticsPage from './pages/StatisticsPage';
import { useTomatoStore } from './core/store/tomatoStore';

function App() {
  // 不要订阅 timeRemaining：每秒倒计时会重绘整棵路由树，
  // 正在输入的中文 IME 组字会被打断（表现为任务标题无法输入）。
  const isRunning = useTomatoStore((s) => s.isRunning);
  const currentTaskTitle = useTomatoStore((s) => s.currentTask?.title);

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
        <Routes>
          <Route path="/" element={<SimpleHomePage />} />
          <Route path="/tasks" element={<SimpleTasksPage />} />
          <Route path="/tomato" element={<SimpleTomatoPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;