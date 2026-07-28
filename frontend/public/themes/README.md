# 桌面小猫主题 (Pet themes)

桌面小猫的动画是「主题化」的,可以随时替换。每个主题为 4 个状态各提供一段动画:

| 状态 | 文件名 | 含义 |
| --- | --- | --- |
| `idle` | `idle.gif` | 闲置 · 趴着睡觉 |
| `focus` | `focus.gif` | 定时 · 猫头(专注中) |
| `celebrate` | `celebrate.gif` | 完成 · 挥旗 |
| `play` | `play.gif` | 调皮 · 蹦跳 |

支持的格式:**GIF / APNG / 动图 WebP**(会自动播放循环),或静态 **PNG**。建议使用**透明背景**、正方形、边缘留白。

## 新增一个主题(3 步)

1. 新建目录 `public/themes/<你的主题id>/`,放入 `idle / focus / celebrate / play` 四个动画文件(同一后缀,如都用 `.gif`)。
2. 在 `src/pet/themes.json` 的 `themes` 数组里加一条:
   ```json
   {
     "id": "my-theme",
     "name": "我的主题",
     "kind": "image",
     "dir": "themes/my-theme",
     "ext": "gif",
     "pixelated": true
   }
   ```
   - `pixelated: true` 让像素图放大后保持清晰;非像素风的图请设为 `false`。
3. 重新构建 / 运行(`npm run electron:build` 或 `npm run electron:dev`)。之后右键小猫 → **主题** 即可选择,选择会被记住。

> 内置的 `pixel` 主题是用 canvas 逐帧绘制的矢量像素猫(帧数据在 `src/pet/sprites.json`),不需要图片文件。
>
> 示例主题 `pixel-gif` 里的 GIF 是用 `npm run themes:gif` 从 `sprites.json` 自动生成的,可作为你自制主题的模板。
