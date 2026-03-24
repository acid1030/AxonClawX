/**
 * AxonClaw - Electron Builder 打包配置
 * 
 * 用于配置 Electron 应用的打包选项
 */

const config = {
  appId: 'com.openclaw.axonclaw',
  productName: 'AxonClaw',
  copyright: 'Copyright © 2026 OpenClaw Team',

  directories: {
    output: 'release/${version}',
    buildResources: 'build',
  },

  files: [
    'out/**/*',
    'package.json',
  ],

  extraMetadata: {
    main: 'out/main/index.js',
  },

  // macOS
  mac: {
    category: 'public.app-category.productivity',
    icon: 'build/icon.icns',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },

  // Windows
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
  },

  // Linux
  linux: {
    icon: 'build/icons',
    category: 'Utility',
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64'],
      },
    ],
  },

  // NSIS 安装程序
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'AxonClaw',
  },

  // DMG 安装镜像
  dmg: {
    background: 'build/background.png',
    iconSize: 100,
    contents: [
      {
        x: 380,
        y: 180,
        type: 'link',
        path: '/Applications',
      },
      {
        x: 130,
        y: 180,
        type: 'file',
      },
    ],
  },

  // 自动更新
  publish: {
    provider: 'github',
    owner: 'openclaw',
    repo: 'axonclaw',
  },
};

module.exports = config;
