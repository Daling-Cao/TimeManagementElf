import React from 'react';
import { formatDueLabel, quickDueOptions, todayKey } from '../core/schedule';

interface Props {
  /** 'YYYY-MM-DD'；空字符串表示不安排日期。 */
  value: string;
  onChange: (value: string) => void;
}

const chip = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 999,
  border: `1px solid ${active ? '#0284c7' : '#d1d5db'}`,
  background: active ? '#e0f2fe' : 'white',
  color: active ? '#0369a1' : '#374151',
  fontSize: 13,
  cursor: 'pointer',
});

/** 计划日期选择：不定 / 今天 / 明天 / 下周 / 下个月，或者在日期框里选任意一天。 */
const DueDatePicker: React.FC<Props> = ({ value, onChange }) => {
  const today = todayKey();
  const options = quickDueOptions(today);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <button type="button" style={chip(!value)} onClick={() => onChange('')}>
          不定
        </button>
        {options.map((o) => (
          <button type="button" key={o.label} style={chip(value === o.value)} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <span style={{ fontSize: 13, color: value && value < today ? '#ef4444' : '#6b7280' }}>
          {value ? `${formatDueLabel(value, today)}${value < today ? '（已过）' : ''}` : '不安排日期，留在任务列表里'}
        </span>
      </div>
    </div>
  );
};

export default DueDatePicker;
