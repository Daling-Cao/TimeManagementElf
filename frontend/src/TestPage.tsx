import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>时间管理小精灵</h1>
      <p style={{ color: '#666', fontSize: '16px' }}>这是一个测试页面，用于确认应用是否正常运行。</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#2563eb', marginBottom: '10px' }}>功能状态</h2>
        <ul style={{ color: '#374151', lineHeight: '1.6' }}>
          <li>✅ 前端项目已初始化</li>
          <li>✅ 后端 API 已配置</li>
          <li>✅ 数据库模型已设计</li>
          <li>✅ 任务列表功能已完成</li>
          <li>🚧 番茄钟功能开发中</li>
        </ul>
        <div style={{ marginTop: '20px' }}>
          <a 
            href="/tasks" 
            style={{ 
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            查看任务列表 →
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
