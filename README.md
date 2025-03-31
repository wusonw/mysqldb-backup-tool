# MySQL 备份工具

一个基于 Tauri + Vue3 + TypeScript 的 MySQL 数据库备份工具，提供直观的图形界面，支持多种备份方式，让数据库备份变得简单而高效。

## 主要功能

- 简洁直观的用户界面
- 支持两种备份引擎:
  - 系统内置的 mysqldump 命令行工具
  - 内置 Rust MySQL 备份引擎（无需安装额外软件）
- 自动检测并选择最佳备份方式
- 实时显示备份进度和当前操作表
- 支持设置数据库连接参数
- 支持自定义备份目录
- 支持深色/浅色主题模式
- 备份文件自动压缩
- 自动清理过期备份

## 开发环境配置

### 前置需求

- [Node.js](https://nodejs.org/) (16.x 或更高版本)
- [pnpm](https://pnpm.io/installation) 包管理器
- [Rust](https://www.rust-lang.org/tools/install) (用于 Tauri 后端)
- [Visual Studio Code](https://code.visualstudio.com/)（推荐）

### 推荐的 IDE 设置

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (Vue 支持)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) (Tauri 支持)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) (Rust 支持)

## 开始使用

### 开发模式

1. 安装依赖：

```bash
pnpm install
```

2. 启动开发服务器：

```bash
pnpm tauri dev
```

### 构建生产版本

```bash
pnpm tauri build
```

生成的安装程序将位于`src-tauri/target/release/bundle`目录中。

## 技术栈

- **前端**：

  - Vue 3 (使用组合式 API 和`<script setup>`)
  - TypeScript
  - Vuetify 3 (UI 组件库)
  - Pinia (状态管理)
  - Vite (构建工具)

- **后端**：
  - Rust
  - Tauri 框架
  - MySQL 客户端库

## 应用架构

应用程序分为两个主要部分：

1. **前端** (Vue3)：提供用户界面，使用 Tauri API 与后端通信。
2. **后端** (Rust)：处理数据库连接和备份逻辑，提供 API 供前端调用。

备份过程通过事件系统向前端报告进度，确保用户获得良好的反馈体验。

## 许可证

[MIT](LICENSE)
