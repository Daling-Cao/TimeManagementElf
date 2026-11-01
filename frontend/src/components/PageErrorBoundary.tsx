import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// 页面渲染抛错时，React 会卸载整棵树，窗口只剩白屏且切换路由也救不回来。
// 用错误边界兜住单个页面，显示可恢复的提示；App 用 location 作为 key，换页即自动重置。
class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('页面渲染出错:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '480px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>😿</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            页面出了点问题
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px', wordBreak: 'break-word' }}>
            {this.state.error.message || '未知错误'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a
              href="#/"
              style={{
                padding: '10px 20px',
                backgroundColor: '#0284c7',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              返回首页
            </a>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#e5e7eb',
                color: '#111827',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
