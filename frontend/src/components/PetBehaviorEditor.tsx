import React, { useState } from 'react';
import type { PetBehavior, PetStateId } from '../pet/petAPI';

interface Props {
  behavior: PetBehavior;
  states: { id: PetStateId; name: string }[];
  busy: boolean;
  onSave: (behavior: PetBehavior) => void;
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
  fontSize: '13px',
  color: '#374151',
  padding: '6px 0',
};
const input: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
};
const smallButton: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: 'white',
  fontSize: '12px',
  cursor: 'pointer',
  color: '#374151',
};
const sectionTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#111827',
  margin: '14px 0 4px',
};
const hint: React.CSSProperties = { fontSize: '12px', color: '#9ca3af' };

function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

/** 编辑「什么时候显示哪个状态」。改完点保存才写入。 */
const PetBehaviorEditor: React.FC<Props> = ({ behavior, states, busy, onSave }) => {
  const [draft, setDraft] = useState<PetBehavior>(behavior);
  const dirty = JSON.stringify(draft) !== JSON.stringify(behavior);

  const set = (patch: Partial<PetBehavior>) => setDraft((d) => ({ ...d, ...patch }));

  const stateSelect = (
    value: PetStateId,
    onChange: (id: PetStateId) => void,
    emptyLabel?: string,
  ) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={input}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {states.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );

  const firstOther = states.find((s) => s.id !== 'idle')?.id ?? 'idle';

  return (
    <div>
      <div style={sectionTitle}>基本</div>
      <div style={row}>
        <span style={{ width: '120px' }}>闲置时</span>
        {stateSelect(draft.idle, (idle) => set({ idle }))}
      </div>
      <div style={row}>
        <span style={{ width: '120px' }}>番茄钟进行中</span>
        {stateSelect(draft.focus, (focus) => set({ focus }))}
      </div>
      <div style={row}>
        <span style={{ width: '120px' }}>番茄钟暂停时</span>
        {stateSelect(draft.paused, (paused) => set({ paused }), '和进行中一样')}
      </div>
      <div style={row}>
        <span style={{ width: '120px' }}>休息时</span>
        {stateSelect(draft.break, (value) => set({ break: value }), '和闲置一样')}
      </div>
      <div style={row}>
        <span style={{ width: '120px' }}>完成一个番茄后</span>
        {stateSelect(draft.celebrate.state, (state) =>
          set({ celebrate: { ...draft.celebrate, state } }),
        )}
        播放
        <input
          type="number"
          min={1}
          max={600}
          value={draft.celebrate.seconds}
          onChange={(e) =>
            set({
              celebrate: { ...draft.celebrate, seconds: toNumber(e.target.value, 6) },
            })
          }
          style={{ ...input, width: '64px' }}
        />
        秒
      </div>

      <div style={sectionTitle}>闲置时随机出现</div>
      <div style={hint}>不在专注、休息时，每隔一段随机时间播放一次，播完回到闲置。</div>
      {draft.random.map((rule, i) => (
        <div key={i} style={row}>
          {stateSelect(rule.state, (state) =>
            set({ random: draft.random.map((r, j) => (j === i ? { ...r, state } : r)) }),
          )}
          每隔
          <input
            type="number"
            min={1}
            max={1440}
            value={rule.minMinutes}
            onChange={(e) =>
              set({
                random: draft.random.map((r, j) =>
                  j === i ? { ...r, minMinutes: toNumber(e.target.value, 30) } : r,
                ),
              })
            }
            style={{ ...input, width: '64px' }}
          />
          –
          <input
            type="number"
            min={1}
            max={1440}
            value={rule.maxMinutes}
            onChange={(e) =>
              set({
                random: draft.random.map((r, j) =>
                  j === i ? { ...r, maxMinutes: toNumber(e.target.value, 45) } : r,
                ),
              })
            }
            style={{ ...input, width: '64px' }}
          />
          分钟，持续
          <input
            type="number"
            min={1}
            max={600}
            value={rule.seconds}
            onChange={(e) =>
              set({
                random: draft.random.map((r, j) =>
                  j === i ? { ...r, seconds: toNumber(e.target.value, 6) } : r,
                ),
              })
            }
            style={{ ...input, width: '64px' }}
          />
          秒
          <button
            style={smallButton}
            onClick={() => set({ random: draft.random.filter((_, j) => j !== i) })}
          >
            删除
          </button>
        </div>
      ))}
      {draft.random.length < 10 && (
        <button
          style={{ ...smallButton, marginTop: '4px' }}
          onClick={() =>
            set({
              random: [
                ...draft.random,
                { state: firstOther, minMinutes: 30, maxMinutes: 45, seconds: 6 },
              ],
            })
          }
        >
          ＋ 添加随机动作
        </button>
      )}

      <div style={sectionTitle}>按时间段替换闲置状态</div>
      <div style={hint}>例如 22:00–07:00 显示「睡觉」。结束时间早于开始时间表示跨过午夜；多条重叠时用靠上的那条。</div>
      {draft.schedule.map((rule, i) => (
        <div key={i} style={row}>
          <input
            type="time"
            value={rule.from}
            onChange={(e) =>
              set({
                schedule: draft.schedule.map((r, j) =>
                  j === i ? { ...r, from: e.target.value || r.from } : r,
                ),
              })
            }
            style={input}
          />
          到
          <input
            type="time"
            value={rule.to}
            onChange={(e) =>
              set({
                schedule: draft.schedule.map((r, j) =>
                  j === i ? { ...r, to: e.target.value || r.to } : r,
                ),
              })
            }
            style={input}
          />
          显示
          {stateSelect(rule.state, (state) =>
            set({ schedule: draft.schedule.map((r, j) => (j === i ? { ...r, state } : r)) }),
          )}
          <button
            style={smallButton}
            onClick={() => set({ schedule: draft.schedule.filter((_, j) => j !== i) })}
          >
            删除
          </button>
        </div>
      ))}
      {draft.schedule.length < 10 && (
        <button
          style={{ ...smallButton, marginTop: '4px' }}
          onClick={() =>
            set({
              schedule: [...draft.schedule, { from: '22:00', to: '07:00', state: draft.idle }],
            })
          }
        >
          ＋ 添加时间段
        </button>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
        <button
          disabled={!dirty || busy}
          onClick={() => onSave(draft)}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            cursor: dirty ? 'pointer' : 'default',
            backgroundColor: dirty ? '#0284c7' : '#e5e7eb',
            color: dirty ? 'white' : '#9ca3af',
          }}
        >
          保存行为设置
        </button>
        {dirty && (
          <button style={smallButton} onClick={() => setDraft(behavior)}>
            撤销修改
          </button>
        )}
        {dirty && <span style={{ fontSize: '12px', color: '#d97706' }}>有未保存的修改</span>}
      </div>
    </div>
  );
};

export default PetBehaviorEditor;
