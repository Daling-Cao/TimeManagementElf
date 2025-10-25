import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleHomePage from './pages/SimpleHomePage';
import SimpleTasksPage from './pages/SimpleTasksPage';
import SimpleTomatoPage from './pages/SimpleTomatoPage';
import StatisticsPage from './pages/StatisticsPage';

function App() {
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