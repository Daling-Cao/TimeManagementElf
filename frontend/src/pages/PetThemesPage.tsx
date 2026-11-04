import React, { useCallback, useEffect, useRef, useState } from 'react';
import PixelCat from '../pet/PixelCat';
import PetBehaviorEditor from '../components/PetBehaviorEditor';
import {
  DEFAULT_SIZE,
  DEFAULT_THEME_ID,
  MAX_SIZE,
  MIN_SIZE,
  MOTION_LABELS,
  THEMES,
  fromCustom,
  getTheme,
  isStandardState,
  resolveStateSource,
  stateMotion,
  themeStates,
} from '../pet/theme';
import type {
  CustomPetTheme,
  CustomPetThemePatch,
  PetMotion,
  PetStateId,
  PetThemeResult,
} from '../pet/petAPI';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_CUSTOM_STATES = 20;
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

const fieldInput: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
};

const label: React.CSSProperties = {
  fontSize: '13px',
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

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

/** 滑块：拖动时只改本地值，松手 / 失焦时才保存。 */
const SizeSlider: React.FC<{
  value: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}> = ({ value, disabled, onCommit }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="range"
        min={MIN_SIZE}
        max={MAX_SIZE}
        step={10}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ width: '110px' }}
      />
      <span style={{ fontSize: '12px', color: '#6b7280', width: '44px' }}>{draft}px</span>
    </span>
  );
};

interface StateCardProps {
  theme: CustomPetTheme;
  state: { id: PetStateId; name: string; custom: boolean };
  isActive: boolean;
  busy: boolean;
  onUpload: (state: PetStateId, file: File) => void;
  onClear: (state: PetStateId) => void;
  onPatch: (patch: CustomPetThemePatch, ok?: string) => void;
  onRename: (state: PetStateId, name: string) => void;
  onDelete: (state: PetStateId) => void;
}

const StateCard: React.FC<StateCardProps> = ({
  theme,
  state,
  isActive,
  busy,
  onUpload,
  onClear,
  onPatch,
  onRename,
  onDelete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.name);
  useEffect(() => setNameDraft(state.name), [state.name]);

  const uploaded = !!theme.files[state.id];
  const view = fromCustom(theme);
  const source = resolveStateSource(view, state.id);
  const ownSize = theme.sizes[state.id];
  const motion = stateMotion(view, state.id);
  const fallbackText = isStandardState(state.id)
    ? `沿用「${getTheme(theme.base).name}」`
    : '还没上传，暂时显示闲置动画';

  return (
    <div
      style={{ ...card, padding: '12px', outline: dragOver ? '2px dashed #0284c7' : 'none' }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onUpload(state.id, file);
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        {state.custom ? (
          <input
            value={nameDraft}
            maxLength={20}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => nameDraft.trim() !== state.name && onRename(state.id, nameDraft)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            style={{ ...fieldInput, flex: 1, fontWeight: 600, minWidth: 0 }}
            title="状态名称"
          />
        ) : (
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', flex: 1 }}>
            {state.name}
          </span>
        )}
        {state.custom && (
          <button
            style={{ ...button('danger'), padding: '4px 8px', fontSize: '12px' }}
            disabled={busy}
            onClick={() => onDelete(state.id)}
            title="删除这个状态"
          >
            删除
          </button>
        )}
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
          <PixelCat state={source.state} scale={8} />
        ) : (
          <img
            key={source.url}
            src={source.url}
            alt={state.name}
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
        {uploaded ? '✔ 已使用你上传的动画' : fallbackText}
      </div>

      <div style={{ ...label, fontSize: '12px', marginBottom: '6px' }}>
        <input
          type="checkbox"
          checked={ownSize !== undefined}
          disabled={busy}
          onChange={(e) => {
            const sizes = { ...theme.sizes };
            if (e.target.checked) sizes[state.id] = theme.size;
            else delete sizes[state.id];
            onPatch({ sizes });
          }}
        />
        单独大小
        {ownSize !== undefined ? (
          <SizeSlider
            value={ownSize}
            disabled={busy}
            onCommit={(v) => onPatch({ sizes: { ...theme.sizes, [state.id]: v } })}
          />
        ) : (
          <span style={{ color: '#9ca3af' }}>（用默认 {theme.size}px）</span>
        )}
      </div>
      <div style={{ ...label, fontSize: '12px', marginBottom: '8px' }}>
        附加动作
        <select
          value={motion}
          disabled={busy}
          onChange={(e) =>
            onPatch({ motions: { ...theme.motions, [state.id]: e.target.value as PetMotion } })
          }
          style={{ ...fieldInput, fontSize: '12px', padding: '3px 6px' }}
        >
          {(Object.keys(MOTION_LABELS) as PetMotion[]).map((m) => (
            <option key={m} value={m}>
              {MOTION_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button style={button('primary')} disabled={busy} onClick={() => inputRef.current?.click()}>
          {uploaded ? '替换' : '上传'}
        </button>
        {uploaded && (
          <button style={button()} disabled={busy} onClick={() => onClear(state.id)}>
            {isStandardState(state.id) ? '恢复默认' : '移除动画'}
          </button>
        )}
        <button
          style={{ ...button(), opacity: isActive ? 1 : 0.5 }}
          disabled={!isActive}
          title={isActive ? '让桌面小猫播放这个动作' : '先把这个主题设为桌面小猫'}
          onClick={() => window.petThemesAPI?.preview(state.id)}
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
          if (file) onUpload(state.id, file);
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
  const [newStateName, setNewStateName] = useState('');

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

  // 右键菜单切换主题时编辑页也要跟着更新「使用中」
  useEffect(
    () => api?.onSelectedChanged((id) => setActiveId(id || DEFAULT_THEME_ID)),
    [api],
  );

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

  const patch = (p: CustomPetThemePatch, ok?: string) => {
    if (!editing) return;
    const id = editing.id;
    return run(() => api.update(id, p), ok);
  };

  const upload = (state: PetStateId, file: File) => {
    if (!editing) return;
    if (file.size > MAX_BYTES) {
      setMessage({ text: '文件太大（最大 20 MB）', error: true });
      return;
    }
    const id = editing.id;
    const name = themeStates(fromCustom(editing)).find((s) => s.id === state)?.name ?? state;
    run(async () => {
      const data = new Uint8Array(await file.arrayBuffer());
      return api.setStateFile(id, state, data);
    }, `「${name}」已更新`);
  };

  const saveName = () => {
    if (!editing || nameDraft.trim() === editing.name) return;
    patch({ name: nameDraft });
  };

  const addState = () => {
    if (!editing) return;
    const name = newStateName.trim() || `状态${editing.customStates.length + 1}`;
    patch({ customStates: [...editing.customStates, { name }] }, `已添加状态「${name}」，记得上传它的动画`);
    setNewStateName('');
  };

  const renameState = (stateId: PetStateId, name: string) => {
    if (!editing) return;
    patch({
      customStates: editing.customStates.map((s) => (s.id === stateId ? { ...s, name } : s)),
    });
  };

  const deleteState = (stateId: PetStateId) => {
    if (!editing) return;
    const target = editing.customStates.find((s) => s.id === stateId);
    if (!target || !confirmBox(`删除状态「${target.name}」和它上传的动画？用到它的规则也会被移除。`)) return;
    patch({ customStates: editing.customStates.filter((s) => s.id !== stateId) }, '状态已删除');
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
      // 以主进程记录的当前主题为准，避免页面里的状态过期时误把用户的选择重置
      if ((await api.getSelected()) === id) activate(DEFAULT_THEME_ID);
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

  const states = editing ? themeStates(fromCustom(editing)) : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            maxWidth: '76rem',
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
          maxWidth: '76rem',
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
            listItem(
              t.id,
              t.name,
              `${Object.keys(t.files).length}/${4 + t.customStates.length}`,
              () => setEditingId(t.id),
            ),
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
              <p style={{ marginTop: 0 }}>在这里可以完全定制桌面小猫：</p>
              <ol style={{ paddingLeft: '20px' }}>
                <li>在左边选一个内置主题，点「以此为基础新建」；</li>
                <li>为每个状态上传 GIF（或 APNG / WebP / PNG），调整显示大小和附加动作，还可以添加新的状态；</li>
                <li>在「什么时候显示什么」里设置闲置、专注、暂停、休息、完成时用哪个状态，以及随机动作和按时间段切换；</li>
                <li>点「设为桌面小猫」，右键小猫的「主题」菜单里也能随时切换。</li>
              </ol>
              <p style={{ marginBottom: 0 }}>建议使用透明背景、接近正方形的图片。内置主题不能直接修改，新建一份即可。</p>
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
                <label style={label}>
                  名称
                  <input
                    value={nameDraft}
                    maxLength={40}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    style={{ ...fieldInput, fontSize: '14px', width: '160px' }}
                  />
                </label>
                <label style={label}>
                  没上传的动作沿用
                  <select
                    value={editing.base}
                    disabled={busy}
                    onChange={(e) => patch({ base: e.target.value })}
                    style={fieldInput}
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span style={label}>
                  默认大小
                  <SizeSlider
                    value={editing.size ?? DEFAULT_SIZE}
                    disabled={busy}
                    onCommit={(size) => patch({ size })}
                  />
                </span>
                <label style={{ ...label, gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={editing.pixelated}
                    disabled={busy}
                    onChange={(e) => patch({ pixelated: e.target.checked })}
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

              <h2 style={{ fontSize: '16px', color: '#111827', margin: '8px 0 12px' }}>状态与动画</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                {states.map((state) => (
                  <StateCard
                    key={state.id}
                    theme={editing}
                    state={state}
                    isActive={editing.id === activeId}
                    busy={busy}
                    onUpload={upload}
                    onClear={(s) => {
                      const id = editing.id;
                      run(() => api.clearStateFile(id, s), '已移除上传的动画');
                    }}
                    onPatch={patch}
                    onRename={renameState}
                    onDelete={deleteState}
                  />
                ))}
                {editing.customStates.length < MAX_CUSTOM_STATES && (
                  <div
                    style={{
                      ...card,
                      padding: '16px',
                      borderStyle: 'dashed',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '10px',
                      minHeight: '200px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>＋ 新增状态</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      比如「伸懒腰」「喝水」「打瞌睡」，然后在下面的规则里决定什么时候出现。
                    </div>
                    <input
                      value={newStateName}
                      maxLength={20}
                      placeholder="状态名称"
                      onChange={(e) => setNewStateName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addState()}
                      style={fieldInput}
                    />
                    <button style={button('primary')} disabled={busy} onClick={addState}>
                      添加
                    </button>
                  </div>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
                支持 GIF / APNG / 动图 WebP（自动循环播放），也可以用静态 PNG / JPG；单个文件最大 20 MB。可以直接把图片拖到格子上。
              </p>

              <h2 style={{ fontSize: '16px', color: '#111827', margin: '24px 0 12px' }}>什么时候显示什么</h2>
              <div style={{ ...card, padding: '8px 16px 16px' }}>
                <PetBehaviorEditor
                  key={`${editing.id}:${JSON.stringify(editing.behavior)}`}
                  behavior={editing.behavior}
                  states={states}
                  busy={busy}
                  onSave={(behavior) => patch({ behavior }, '行为设置已保存')}
                />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default PetThemesPage;
