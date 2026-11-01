// localStorage 里的 tasks / tomatoSessions 可能被旧版本、手动编辑或桌面数据文件写坏。
// 页面直接 JSON.parse 后调用 .filter/.map，一旦不是数组或含 null 项就会在渲染时抛错，
// 整个 React 树被卸载，表现为白屏。统一走这里，保证拿到的一定是对象数组。

export function parseStoredList<T>(value: string | null): T[] | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is T => item !== null && typeof item === 'object');
  } catch {
    return null;
  }
}

export function readStoredList<T>(key: string): T[] {
  return parseStoredList<T>(localStorage.getItem(key)) ?? [];
}
