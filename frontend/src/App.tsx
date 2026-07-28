import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleHomePage from './pages/SimpleHomePage';
import SimpleTasksPage from './pages/SimpleTasksPage';
import SimpleTomatoPage from './pages/SimpleTomatoPage';
import StatisticsPage from './pages/StatisticsPage';
import { useTomatoStore } from './core/store/tomatoStore';

function App() {
  const { isRunning, isPaused, resume } = useTomatoStore();

  // 恢复持久化的计时器
  useEffect(() => {
    // 如果有运行中但未暂停的计时器，恢复它
    if (isRunning && !isPaused) {
      resume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在首次加载时执行

  // 添加网页关闭确认提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = '番茄钟正在运行，确定要离开吗？';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

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