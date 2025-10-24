import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleApp from './SimpleApp';
import SimpleTasksPage from './pages/SimpleTasksPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<SimpleApp />} />
          <Route path="/tasks" element={<SimpleTasksPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;