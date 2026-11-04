import React from 'react';
import { DEFAULT_CALENDAR_ID } from '../core/calendars';
import { useCalendars } from '../core/useCalendars';

interface Props {
  /** 本地日历 id；空字符串 / undefined 视为默认日历。 */
  value: string | undefined;
  onChange: (calendarId: string) => void;
  style?: React.CSSProperties;
}

/** 选择任务放进哪个本地日历（导入 / 订阅的日历是只读的，不在这里出现）。 */
const CalendarSelect: React.FC<Props> = ({ value, onChange, style }) => {
  const locals = useCalendars().filter((c) => c.kind === 'local');
  const current = value && locals.some((c) => c.id === value) ? value : DEFAULT_CALENDAR_ID;
  const color = locals.find((c) => c.id === current)?.color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flex: 'none' }} />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '8px 10px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {locals.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CalendarSelect;
