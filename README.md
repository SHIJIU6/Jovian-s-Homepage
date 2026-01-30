# Jovian-s-Homepage

## 本地开发 / 部署

- 安装依赖：`npm install`
- 生成静态资源（必须生成 `public/assets/tailwind.css` / `public/assets/app.js`）：`npm run build`
- 本地预览：`npm run dev`
- 部署到 Cloudflare Pages（wrangler）：`npm run deploy`

### 目录说明（B 档性能构建）

- Tailwind 输入：`src/tailwind.css`（只包含 `@tailwind ...` 指令）
- 自定义样式：`public/custom.css`（原先内联 `<style>` 的内容）
- 入口脚本：`src/app.js`（原先内联 `<script>` 的内容）
- 构建产物：`public/assets/`（已加入 `.gitignore`，由 `npm run build` 生成）

### Cloudflare Pages（Git 集成）推荐设置

- Build command：`npm run build`
- Build output directory：`public`
