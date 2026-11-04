import React, { useCallback, useEffect, useRef, useState } from 'react';
import PixelCat from '../pet/PixelCat';
import {
  DEFAULT_THEME_ID,
  PET_STATES,
  STATE_LABELS,
  THEMES,
  fromCustom,
  getTheme,
  resolveStateSource,
} from '../pet/theme';
import type { CustomPetTheme, PetThemeResult, PetVisualState } from '../pet/petAPI';

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = 'image/gif,image/png,image/apng,image/webp,image/jpeg,.gif,.png,.apng,.webp,.jpg,.jpeg';

const card: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const button = (variant: 'primary' | 'plain' | 'danger' = 'plain'): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  border: variant === 'plain' ? '1px solid #d1d5db' : 'none',
  backgroundColor: variant === 'primary' ? '#0284c7' : variant === 'danger' ? '#fee2e2' : 'white',
  color: variant === 'primary' ? 'white' : variant === 'danger' ? '#b91c1c' : '#374151',
});

// 透明图片的棋盘格背景
const checkerboard: React.CSSProperties = {
  backgroundColor: '#fff',
  backgroundImage:
    'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

function confirmBox(message: string): boolean {
  return window.dialogAPI ? window.dialogAPI.confirm(message) : window.confirm(message);
}

interface StateCardProps {
  theme: CustomPetTheme;
  state: PetVisualState;
  isActive: boolean;
  busy: boolean;
  onUpload: (state: PetVisualState, file: File) => void;
  onClear: (state: PetVisualState) => void;
}

const StateCard: React.FC<StateCardProps> = ({ theme, state, isActive, busy, onUpload, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploaded = !!theme.files[state];
  const source = resolveStateSource(fromCustom(theme), state);
  const baseName = getTheme(theme.base).name;

  return (
    <div
      style={{
        ...card,
        padding: '12px',
        outline: dragOver ? '2px dashed #0284c7' : 'none',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onUpload(state, file);
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '8px' }}>
        {STATE_LABELS[state]}
      </div>
      <div
        style={{
          ...checkerboard,
          height: '150px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: busy ? 'wait' : 'pointer',
        }}
        title="点击或把图片拖到这里上传"
        onClick={() => !busy && inputRef.current?.click()}
      >
        {source.kind === 'builtin' ? (
          <PixelCat state={state} scale={8} />
        ) : (
          <img
            key={source.url}
            src={source.url}
            alt={state}
            draggable={false}
            style={{
              width: '140px',
              height: '140px',
              objectFit: 'contain',
              imageRendering: source.pixelated ? 'pixelated' : 'auto',
            }}
          />
        )}
      </div>
      <div style={{ fontSize: '12px', color: uploaded ? '#059669' : '#6b7280', margin: '8px 0' }}>
        {uploaded ? '✔ 已使用你上传的动画' : `沿用「${baseName}」`}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button style={button('primary')} disabled={busy} onClick={() => inputRef.current?.click()}>
          {uploaded ? '替换' : '上传'}
        </button>
        {uploaded && (
          <button style={button()} disabled={busy} onClick={() => onClear(state)}>
            恢复默认
          </button>
        )}
        <button
          style={{ ...button(), opacity: isActive ? 1 : 0.5 }}
          disabled={!isActive}
          title={isActive ? '让桌面小猫播放这个动作' : '先把这个主题设为桌面小猫'}
          onClick={() => window.petThemesAPI?.preview(state)}
        >
          桌面预览
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onUpload(state, file);
        }}
      />
    </div>
  );
};

const PetThemesPage: React.FC = () => {
  const api = window.petThemesAPI;
  const [customs, setCustoms] = useState<CustomPetTheme[]>([]);
  const [editingId, setEditingId] = useState<string>('');
  const [activeId, setActiveId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const editing = customs.find((t) => t.id === editingId) ?? null;

  const refresh = useCallback(async () => {
    if (!api) return;
    const [list, selected] = await Promise.all([api.list(), api.getSelected()]);
    setCustoms(list);
    setActiveId(selected || DEFAULT_THEME_ID);
    setEditingId((current) => (list.some((t) => t.id === current) ? current : list[0]?.id ?? ''));
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setNameDraft(editing?.name ?? '');
  }, [editing?.id, editing?.name]);

  // 统一处理调用结果：成功就更新列表里的这一项
  const run = async <T,>(
    task: () => Promise<PetThemeResult<T>>,
    ok?: string,
  ): Promise<T | undefined> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await task();
      if (!res.ok) {
        setMessage({ text: res.error, error: true });
        return undefined;
      }
      const value = res.result as unknown;
      if (value && typeof value === 'object' && (value as CustomPetTheme).kind === 'custom') {
        const updated = value as CustomPetTheme;
        setCustoms((prev) =>
          prev.some((t) => t.id === updated.id)
            ? prev.map((t) => (t.id === updated.id ? updated : t))
            : [...prev, updated],
        );
      }
      if (ok) setMessage({ text: ok });
      return res.result;
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), error: true });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  if (!api) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
        自定义小猫动画只在桌面版可用。<a href="#/tasks">返回任务</a>
      </div>
    );
  }

  const createTheme = async (base: string) => {
    const baseName = getTheme(base).name.replace(/（内置）/, '');
    const created = await run(
      () => api.create({ name: `我的${baseName}`, base, pixelated: getTheme(base).pixelated !== false }),
      '已新建主题，点击下面的格子为每个动作上传动画',
    );
    if (created) setEditingId(created.id);
  };

  const upload = (state: PetVisualState, file: File) => {
    if (!editing) return;
    if (file.size > MAX_BYTES) {
      setMessage({ text: '文件太大（最大 20 MB）', error: true });
      return;
    }
    const id = editing.id;
    run(async () => {
      const data = new Uint8Array(await file.arrayBuffer());
      return api.setStateFile(id, state, data);
    }, `「${STATE_LABELS[state]}」已更新`);
  };

  const saveName = () => {
    if (!editing || nameDraft.trim() === editing.name) return;
    const id = editing.id;
    run(() => api.update(id, { name: nameDraft }));
  };

  const activate = (id: string) => {
    api.select(id);
    setActiveId(id);
    setMessage({ text: '桌面小猫已换成这个主题' });
  };

  const removeTheme = async () => {
    if (!editing) return;
    if (!confirmBox(`删除主题「${editing.name}」和它上传的所有动画？`)) return;
    const id = editing.id;
    const done = await run(() => api.remove(id), '主题已删除');
    if (done) {
      if (activeId === id) activate(DEFAULT_THEME_ID);
      await refresh();
    }
  };

  const listItem = (id: string, name: string, tag: string, onClick?: () => void) => (
    <div
      key={id}
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: id === editingId ? '#e0f2fe' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ flex: 1, fontSize: '14px', color: '#111827' }}>{name}</span>
      {id === activeId && (
        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>使用中</span>
      )}
      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{tag}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            maxWidth: '72rem',
            margin: '0 auto',
            padding: '0 16px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
            🎨 小猫动画
          </h1>
          <a href="#/tasks" style={{ color: '#0284c7', fontSize: '14px' }}>
            ← 返回任务
          </a>
        </div>
      </header>

      <main
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '24px 16px',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 280px) 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <aside style={{ ...card, padding: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', margin: '4px 4px 8px' }}>内置主题</div>
          {THEMES.map((t) => (
            <div key={t.id}>
              {listItem(t.id, t.name, '内置')}
              <div style={{ display: 'flex', gap: '6px', padding: '0 12px 8px' }}>
                <button style={button()} disabled={busy} onClick={() => createTheme(t.id)}>
                  ＋ 以此为基础新建
                </button>
                {t.id !== activeId && (
                  <button style={button()} onClick={() => activate(t.id)}>
                    使用
                  </button>
                )}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#6b7280', margin: '12px 4px 8px' }}>我的主题</div>
          {customs.length === 0 && (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '4px 12px 8px' }}>
              还没有，点上面的「以此为基础新建」开始
            </div>
          )}
          {customs.map((t) =>
            listItem(t.id, t.name, `${Object.keys(t.files).length}/4`, () => setEditingId(t.id)),
          )}
          <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '12px', paddingTop: '12px' }}>
            <button style={button()} onClick={() => api.openFolder()}>
              打开主题文件夹
            </button>
          </div>
        </aside>

        <section>
          {message && (
            <div
              style={{
                ...card,
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: message.error ? '#b91c1c' : '#065f46',
                backgroundColor: message.error ? '#fef2f2' : '#ecfdf5',
                borderColor: message.error ? '#fecaca' : '#a7f3d0',
              }}
            >
              {message.text}
            </div>
          )}

          {!editing ? (
            <div style={{ ...card, padding: '32px', color: '#6b7280', fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginTop: 0 }}>在这里可以给桌面小猫的每个动作换上自己的动画：</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li>在左边选一个内置主题，点「以此为基础新建」；</li>
                <li>为「闲置 / 专注 / 完成 / 调皮」分别上传 GIF（或 APNG / WebP / PNG），没上传的动作沿用基础主题；</li>
                <li>点「设为桌面小猫」，右键小猫的「主题」菜单里也能随时切换。</li>
              </ol>
              <p style={{ marginBottom: 0 }}>建议使用透明背景、接近正方形的图片，桌面上显示约 190×190。</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  ...card,
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px 20px',
                  alignItems: 'center',
                }}
              >
                <label style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  名称
                  <input
                    value={nameDraft}
                    maxLength={40}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', width: '180px' }}
                  />
                </label>
                <label style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  没上传的动作沿用
                  <select
                    value={editing.base}
                    disabled={busy}
                    onChange={(e) => {
                      const id = editing.id;
                      const base = e.target.value;
                      run(() => api.update(id, { base }));
                    }}
                    style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={editing.pixelated}
                    disabled={busy}
                    onChange={(e) => {
                      const id = editing.id;
                      const pixelated = e.target.checked;
                      run(() => api.update(id, { pixelated }));
                    }}
                  />
                  像素风（放大不模糊）
                </label>
                <div style={{ flex: 1 }} />
                {editing.id === activeId ? (
                  <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>✔ 桌面小猫正在使用</span>
                ) : (
                  <button style={button('primary')} onClick={() => activate(editing.id)}>
                    设为桌面小猫
                  </button>
                )}
                <button style={button('danger')} disabled={busy} onClick={removeTheme}>
                  删除主题
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {PET_STATES.map((state) => (
                  <StateCard
                    key={state}
                    theme={editing}
                    state={state}
                    isActive={editing.id === activeId}
                    busy={busy}
                    onUpload={upload}
                    onClear={(s) => {
                      const id = editing.id;
                      run(() => api.clearStateFile(id, s), `「${STATE_LABELS[s]}」已恢复默认`);
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
                支持 GIF / APNG / 动图 WebP（自动循环播放），也可以用静态 PNG / JPG；单个文件最大 20 MB。可以直接把图片拖到格子上。
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default PetThemesPage;
