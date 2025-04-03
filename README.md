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
- 支持自定义备份目录和文件命名格式
- 支持深色/浅色主题模式
- 备份文件自动压缩（支持 ZIP 格式）
- 自动清理过期备份（可设置保留天数）
- 支持计划任务，定时自动备份
- 备份历史记录查看和管理

## 用户指南

### 安装

1. 从[发布页面](https://github.com/wusonw/mysqldb-backup-tool/releases)下载最新版安装包
2. 运行安装程序，按照指示完成安装
3. 启动应用程序

### 首次使用

1. 添加数据库连接：

   - 点击"添加连接"按钮
   - 填写 MySQL 服务器信息（主机、端口、用户名、密码）
   - 测试连接并保存

2. 配置备份：

   - 选择要备份的数据库
   - 设置备份目标目录
   - 选择备份引擎（自动/mysqldump/内置引擎）
   - 配置压缩选项

3. 执行备份：
   - 点击"开始备份"按钮
   - 查看实时进度
   - 备份完成后查看结果报告

## 开发环境配置

### 前置需求

- [Node.js](https://nodejs.org/) (16.x 或更高版本)
- [pnpm](https://pnpm.io/installation) 包管理器
- [Rust](https://www.rust-lang.org/tools/install) (用于 Tauri 后端)
- [Visual Studio Code](https://code.visualstudio.com/)（推荐）
- MySQL 服务器（用于测试）

### 推荐的 IDE 设置

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (Vue 支持)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) (Tauri 支持)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) (Rust 支持)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) (代码检查)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (代码格式化)

## 开始使用

### 克隆仓库

```bash
git clone https://github.com/wusonw/mysql-backup-tool.git
cd mysql-backup-tool
```

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

### 目录结构

```
mysql-backup-tool/
├── src/                  # 前端Vue代码
│   ├── assets/           # 静态资源
│   ├── components/       # Vue组件
│   ├── views/            # 页面视图
│   ├── stores/           # Pinia状态管理
│   ├── locales/          # 国际化文件
│   └── App.vue           # 主应用组件
├── src-tauri/            # Rust后端代码
│   ├── src/              # Rust源代码
│   └── Cargo.toml        # Rust依赖配置
├── public/               # 静态文件
└── package.json          # 前端依赖配置
```

## 贡献指南

我们欢迎所有形式的贡献，无论是新功能、bug 修复还是文档改进。

### 提交 Pull Request

1. Fork 本仓库
2. 创建您的特性分支：`git checkout -b feature/amazing-feature`
3. 提交您的更改：`git commit -m '添加了一些很棒的功能'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 编码规范

- 遵循项目现有的代码风格
- 为所有新功能添加适当的测试
- 更新文档以反映代码变更

## 故障排除

### 常见问题

1. **问题**: 无法连接到 MySQL 服务器
   **解决方案**: 检查主机名、端口、用户名和密码是否正确。确保 MySQL 服务器允许远程连接。

2. **问题**: 备份过程中断
   **解决方案**: 检查网络连接和 MySQL 服务器状态。增加连接超时设置。

3. **问题**: 找不到 mysqldump 命令
   **解决方案**: 确保 MySQL 客户端工具已安装并添加到系统 PATH 中，或使用内置备份引擎。

### 错误报告

如果您遇到任何问题，请[提交 issue](https://github.com/wusonw/mysqldb-backup-tool/issues)，并提供以下信息：

- 操作系统版本
- 应用程序版本
- 错误消息和截图
- 重现步骤

## 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件
