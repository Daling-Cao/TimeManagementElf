import React, { useState } from 'react';
import { useTimerStore } from '../../core/store';

const TomatoConfig: React.FC = () => {
  const { config, setConfig } = useTimerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    setConfig(localConfig);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            番茄钟配置
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '6px 16px',
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            编辑
          </button>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <ConfigItem label="专注时长" value={`${config.duration} 分钟`} />
          <ConfigItem label="短休息" value={`${config.shortBreak} 分钟`} />
          <ConfigItem label="长休息" value={`${config.longBreak} 分钟`} />
          <ConfigItem label="自动开始" value={config.autoStart ? '开启' : '关闭'} />
          <ConfigItem label="提示音" value={config.soundEnabled ? '开启' : '关闭'} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      padding: '20px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '16px'
      }}>
        编辑配置
      </h3>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
        {/* 专注时长 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            专注时长（分钟）
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={localConfig.duration}
            onChange={(e) => setLocalConfig({
              ...localConfig,
              duration: parseInt(e.target.value) || 25
            })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 短休息 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            短休息（分钟）
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={localConfig.shortBreak}
            onChange={(e) => setLocalConfig({
              ...localConfig,
              shortBreak: parseInt(e.target.value) || 5
            })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 长休息 */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            长休息（分钟）
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={localConfig.longBreak}
            onChange={(e) => setLocalConfig({
              ...localConfig,
              longBreak: parseInt(e.target.value) || 15
            })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 自动开始 */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={localConfig.autoStart}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                autoStart: e.target.checked
              })}
              style={{
                width: '16px',
                height: '16px',
                marginRight: '8px',
                cursor: 'pointer'
              }}
            />
            休息后自动开始下一个番茄钟
          </label>
        </div>

        {/* 提示音 */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={localConfig.soundEnabled}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                soundEnabled: e.target.checked
              })}
              style={{
                width: '16px',
                height: '16px',
                marginRight: '8px',
                cursor: 'pointer'
              }}
            />
            启用提示音
          </label>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          保存
        </button>
        <button
          onClick={handleCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
};

// 配置项显示组件
const ConfigItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb'
  }}>
    <span style={{ fontSize: '14px', color: '#6b7280' }}>{label}</span>
    <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{value}</span>
  </div>
);

export default TomatoConfig;

