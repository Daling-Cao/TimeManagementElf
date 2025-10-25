import React from 'react';

const SimpleHomePage: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        marginBottom: '20px',
        borderRadius: '8px'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
          时间管理小精灵
        </h1>
      </header>

      <main style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          欢迎使用！
        </h2>
        
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          这是一个时间管理应用，帮助您更好地管理任务和时间。
        </p>

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
          <a
            href="/tasks"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#0284c7',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500'
            }}
          >
            📋 任务列表
          </a>
          
          <a
            href="/tomato"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500'
            }}
          >
            🍅 番茄钟
          </a>

          <a
            href="/statistics"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500'
            }}
          >
            📊 统计
          </a>
        </div>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
            💡 功能状态
          </h3>
          <ul style={{ color: '#1e40af', margin: 0, paddingLeft: '20px' }}>
            <li>✅ 任务管理（创建、编辑、删除）</li>
            <li>✅ 番茄钟计时器</li>
            <li>✅ 统计面板和数据可视化</li>
            <li>✅ 本地存储（LocalStorage）</li>
            <li>⏳ 后端同步（开发中）</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default SimpleHomePage;

