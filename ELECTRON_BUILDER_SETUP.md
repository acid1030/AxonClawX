# AxonClaw - Electron Builder 配置完成

## ✅ 已创建的配置文件

1. **electron-builder.yml** - Electron Builder 主配置
   - macOS/Windows/Linux 打包配置
   - 代码签名配置
   - 输出目录配置

2. **electron-builder.config.js** - JavaScript 配置（备选）
   - 功能与 YAML 配置相同
   - 可通过 `npm run electron:build:config` 使用

3. **build/entitlements.mac.plist** - macOS 权限配置
   - 允许网络请求
   - 允许文件读写
   - 允许子进程

4. **tsconfig.main.json** - 主进程 TypeScript 配置
   - 编译 `src/main/` 到 `out/main/`

5. **tsconfig.preload.json** - 预加载脚本 TypeScript 配置
   - 编译 `src/preload/` 到 `out/preload/`

## 📦 构建命令

### 开发模式

```bash
# Web 开发
npm run dev

# Electron 开发
npm run electron:dev
```

### 构建应用

```bash
# 构建当前平台
npm run electron:build

# 构建未打包的目录（用于测试）
npm run electron:build:dir

# 构建特定平台
npm run electron:build:mac      # macOS
npm run electron:build:win      # Windows
npm run electron:build:linux    # Linux
```

### 打包发布

```bash
# 打包并发布到 GitHub
npm run release
```

## 🎨 图标配置

### 需要创建的图标文件

1. **macOS**: `build/icon.icns`
2. **Windows**: `build/icon.ico`
3. **Linux**: `build/icons/*.png`

### 临时解决方案

目前可以使用默认图标。创建方法见 `build/README.md`。

## 📝 构建流程

1. **编译主进程**
   ```bash
   npm run build:main
   ```
   - 编译 `src/main/` → `out/main/`

2. **编译预加载脚本**
   ```bash
   npm run build:preload
   ```
   - 编译 `src/preload/` → `out/preload/`

3. **构建渲染进程**
   ```bash
   npm run build
   ```
   - Vite 构建到 `dist/renderer/`

4. **打包应用**
   ```bash
   npm run electron:build
   ```
   - Electron Builder 打包
   - 输出到 `release/版本号/`

## ⚙️ 配置说明

### macOS 签名

如需代码签名，在 `electron-builder.yml` 中配置：

```yaml
mac:
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

### Windows 签名

如需代码签名，添加配置：

```yaml
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: YOUR_PASSWORD
  signDlls: true
```

### 自动更新

如需自动更新，添加配置：

```yaml
publish:
  provider: github
  owner: openclaw
  repo: axonclaw
```

## 🔍 验证配置

```bash
# 验证配置文件
npx electron-builder --config electron-builder.yml --publish never --dir
```

## 📚 相关文档

- [Electron Builder 文档](https://www.electron.build/)
- [Electron Builder CLI](https://www.electron.build/cli)
- [Code Signing Guide](https://www.electron.build/code-signing)

---

**配置创建时间**: 2026-03-15
**状态**: ✅ 完成
