// 桌面版走主进程弹框（见 electron/preload.cjs 的 dialogAPI）：Windows 上 Electron 的
// window.confirm/alert 关闭后输入框经常无法再获得焦点。纯网页环境下退回原生弹窗。

export function confirmDialog(message: string): boolean {
  return window.dialogAPI ? window.dialogAPI.confirm(message) : window.confirm(message);
}

export function alertDialog(message: string): void {
  if (window.dialogAPI) {
    window.dialogAPI.alert(message);
  } else {
    window.alert(message);
  }
}
