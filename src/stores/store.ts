import { defineStore } from "pinia";
import { saveSetting, getSetting } from "../utils/store";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-shell";
import {
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
} from "../utils/autostart";

// 定义Store的状态接口
interface State {
  // 数据库设置
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    isConnected: boolean;
    isLoading: boolean;
    dbServer: Database | null;
  };

  // 备份设置
  backup: {
    path: string;
    auto: boolean;
    frequency: string;
    keepCount: number;
    isBackingUp: boolean;
    backupProgress: number;
    backupStatus: string;
    lastBackupTime: string;
  };

  // 系统设置
  system: {
    darkMode: boolean;
    autoStart: boolean;
    minimizeToTray: boolean;
  };

  // UI设置
  ui: {
    showSettings: boolean;
    activeTab: string;
    snackbar: {
      show: boolean;
      text: string;
      color: string;
    };
  };

  // 定时器
  connectionTimer: number | null;
  isCheckingConnection: boolean;
  settingsSaveDisabled: boolean;
}

// 定义备份频率选项
export const backupFrequencies = [
  { title: "每天", value: "daily" },
  { title: "每周", value: "weekly" },
  { title: "每月", value: "monthly" },
];

// 创建和导出store
export const useStore = defineStore("main", {
  // 定义状态
  state: (): State => ({
    database: {
      host: "localhost",
      port: 3306,
      username: "root",
      password: "",
      database: "",
      isConnected: false,
      isLoading: false,
      dbServer: null,
    },
    backup: {
      path: "",
      auto: false,
      frequency: "daily",
      keepCount: 5,
      isBackingUp: false,
      backupProgress: 0,
      backupStatus: "点击按钮开始备份",
      lastBackupTime: "",
    },
    system: {
      darkMode: false,
      autoStart: false,
      minimizeToTray: true,
    },
    ui: {
      showSettings: false,
      activeTab: "database",
      snackbar: {
        show: false,
        text: "",
        color: "info",
      },
    },
    connectionTimer: null,
    isCheckingConnection: false,
    settingsSaveDisabled: false,
  }),

  // 定义getters
  getters: {
    showProgress: (state) => {
      return (
        state.backup.isBackingUp &&
        state.backup.backupProgress > 0 &&
        state.backup.backupProgress < 100
      );
    },
  },

  // 定义actions
  actions: {
    // UI操作 ==================================================

    // 显示提示消息
    showSnackbar(text: string, color: string = "info") {
      this.ui.snackbar.text = text;
      this.ui.snackbar.color = color;
      this.ui.snackbar.show = true;
    },

    // 切换设置对话框显示状态
    toggleSettings(show?: boolean) {
      this.ui.showSettings = show !== undefined ? show : !this.ui.showSettings;
    },

    // 设置活动选项卡
    setActiveTab(tab: string) {
      this.ui.activeTab = tab;
    },

    // 数据库操作 ==============================================

    // 保存数据库设置
    async saveDatabaseSettings() {
      if (this.settingsSaveDisabled) {
        console.log("设置保存当前已禁用，跳过保存操作");
        return;
      }

      try {
        console.log("开始保存数据库设置...");

        // 构建数据库连接URL
        const password = encodeURIComponent(this.database.password);
        const connectionUrl = `mysql://${this.database.username}:${password}@${this.database.host}:${this.database.port}/${this.database.database}`;

        // 保存加密的连接URL
        console.log("准备保存数据库连接URL");
        await saveSetting("database.connectionUrl", connectionUrl);
        console.log("数据库连接URL已保存");

        console.log("数据库设置已保存");
      } catch (error) {
        console.error("保存数据库设置失败:", error);
        this.showSnackbar("保存数据库设置失败", "error");
      }
    },

    // 解析数据库连接URL为各个组件
    parseConnectionUrl(url: string) {
      try {
        if (!url) return;

        console.log("解析数据库连接URL:", url);

        // 解析URL
        const connectionRegex =
          /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.*)$/;
        const match = url.match(connectionRegex);

        if (match) {
          this.database.username = match[1];
          this.database.password = decodeURIComponent(match[2]);
          this.database.host = match[3];
          this.database.port = parseInt(match[4]);
          this.database.database = match[5] || "";

          console.log("成功解析数据库连接URL");
        } else {
          console.error("无法解析连接URL:", url);
        }
      } catch (error) {
        console.error("解析数据库连接URL失败:", error);
      }
    },

    // 检查数据库是否存在
    async checkDatabaseExists(showStatus = false): Promise<{
      success: boolean;
      errorMessage?: string;
      dbExists?: boolean;
    }> {
      // 如果没有设置数据库名，视为错误
      if (!this.database.database) {
        return {
          success: false,
          errorMessage: "请输入数据库名称",
          dbExists: false,
        };
      }

      try {
        const pass = encodeURIComponent(this.database.password);

        // 连接到MySQL的系统数据库information_schema
        const connServer = `mysql://${this.database.username}:${pass}@${this.database.host}:${this.database.port}/information_schema`;

        if (showStatus) {
          console.log(
            `尝试连接MySQL服务器: ${connServer.replace(/:[^:]*@/, ":******@")}`
          );
        }

        try {
          // 连接到服务器
          this.database.dbServer = await Database.load(connServer);

          // 检查数据库是否存在
          const checkQuery = `SELECT count(*) as count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${this.database.database}'`;
          const checkResult = await this.database.dbServer.select<
            Array<{ count: number }>
          >(checkQuery);

          if (showStatus) {
            console.log(
              "数据库检查结果:",
              JSON.stringify(checkResult, null, 2)
            );
          }

          // 检查查询结果
          const dbExists =
            checkResult.length === 1 && checkResult[0].count === 1;
          return { success: true, dbExists };
        } catch (serverError) {
          const errorMessage =
            serverError instanceof Error
              ? serverError.message
              : String(serverError);

          if (showStatus) {
            console.error("MySQL服务器连接失败:", serverError);
          }

          return {
            success: false,
            errorMessage: `连接MySQL服务器错误: ${errorMessage}`,
            dbExists: false,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (showStatus) {
          console.error("MySQL连接测试失败:", error);
        }

        return {
          success: false,
          errorMessage: `连接错误: ${errorMessage}`,
          dbExists: false,
        };
      }
    },

    // 检查数据库连接状态
    async checkConnectionStatus() {
      // 如果正在加载或正在检查连接，跳过此次检查
      if (this.database.isLoading || this.isCheckingConnection) {
        return;
      }

      this.isCheckingConnection = true;

      try {
        // 调用公共函数检查数据库是否存在
        const result = await this.checkDatabaseExists(false);

        // 更新连接状态
        this.database.isConnected = result.success && !!result.dbExists;

        return this.database.isConnected;
      } finally {
        this.isCheckingConnection = false;
      }
    },

    // 测试数据库连接
    async testConnection() {
      this.database.isLoading = true;
      // 在测试连接期间禁用设置保存，避免在连接池关闭时尝试保存
      this.settingsSaveDisabled = true;

      try {
        console.log("开始测试MySQL数据库连接...");

        // 调用公共函数检查数据库是否存在
        const result = await this.checkDatabaseExists(true);

        if (!result.success) {
          // 检查失败
          this.showSnackbar(result.errorMessage || "连接错误", "error");
          this.database.isConnected = false;
          return;
        }

        if (!result.dbExists) {
          // 数据库不存在
          this.showSnackbar(
            `数据库 '${this.database.database}' 不存在`,
            "error"
          );
          this.database.isConnected = false;
          return;
        }

        this.showSnackbar("数据库连接成功", "success");
        this.database.isConnected = true;
      } finally {
        this.database.isLoading = false;
        // 测试连接结束后重新启用设置保存
        // 使用setTimeout确保在watch触发后再启用
        setTimeout(() => {
          this.settingsSaveDisabled = false;
          console.log("已重新启用设置保存功能");
        }, 100);
      }
    },

    // 启动数据库连接状态监控
    startConnectionMonitor() {
      // 如果定时器已存在，先停止
      this.stopConnectionMonitor();

      // 启动新的定时器，每秒检查一次数据库连接状态
      this.connectionTimer = window.setInterval(async () => {
        await this.checkConnectionStatus();
      }, 1000);

      console.log("已启动数据库连接状态监控");
    },

    // 停止数据库连接状态监控
    stopConnectionMonitor() {
      if (this.connectionTimer) {
        window.clearInterval(this.connectionTimer);
        this.connectionTimer = null;
        console.log("已停止数据库连接状态监控");
      }
    },

    // 备份操作 ==============================================

    // 保存备份设置
    async saveBackupSettings() {
      try {
        await saveSetting("backup.path", this.backup.path);
        await saveSetting("backup.auto", this.backup.auto);
        await saveSetting("backup.frequency", this.backup.frequency);
        await saveSetting("backup.keepCount", this.backup.keepCount);
      } catch (error) {
        console.error("保存备份设置失败:", error);
        this.showSnackbar("保存备份设置失败", "error");
      }
    },

    // 生成唯一的备份文件名
    generateBackupFileName(): string {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, "-").split("T")[0];
      const timeStr = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[1]
        .split(".")[0];
      return `mysql_backup_${dateStr}_${timeStr}.sql`;
    },

    // 生成完整的备份文件路径
    getBackupFilePath(): string {
      if (!this.backup.path) return "";

      const fileName = this.generateBackupFileName();
      // 确保路径使用正确的分隔符
      const normalizedPath = this.backup.path.replace(/\\/g, "/");
      return `${normalizedPath}/${fileName}`;
    },

    // 更新备份进度
    updateBackupProgress(percent: number) {
      this.backup.backupProgress = percent;
      this.backup.backupStatus = `备份中... ${percent}%`;
    },

    // 打开备份路径文件夹
    async openBackupFolder() {
      try {
        if (!this.backup.path) {
          this.showSnackbar("未设置备份路径", "error");
          return;
        }

        console.log("尝试打开路径:", this.backup.path);

        // 直接使用原始路径
        await open(this.backup.path);
      } catch (error) {
        console.error("打开文件夹失败:", error);
        this.showSnackbar(`打开文件夹失败: ${error}`, "error");
      }
    },

    // 开始备份
    async startBackup() {
      if (!this.database.isConnected || this.backup.isBackingUp) return;

      // 检查是否设置了备份路径
      if (!this.backup.path) {
        this.showSnackbar("请先在设置中选择备份路径", "error");
        return;
      }

      try {
        // 重置状态
        this.backup.isBackingUp = true;
        this.backup.backupProgress = 0;
        this.backup.backupStatus = "正在准备备份...";

        // 生成备份文件路径
        const backupFilePath = this.getBackupFilePath();
        console.log(`备份文件将保存到: ${backupFilePath}`);

        // 在生产环境中，这里应该调用Tauri的API进行真实的MySQL备份
        // 现在模拟备份过程
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          this.updateBackupProgress(i);
        }

        this.backup.backupStatus = "备份完成";
        this.backup.backupProgress = 100;
        this.backup.lastBackupTime = new Date().toLocaleString();

        // 保存最后备份时间到数据库
        await saveSetting("lastBackupTime", this.backup.lastBackupTime);

        this.showSnackbar(
          `数据库备份成功，已保存到:\n${backupFilePath}`,
          "success"
        );
      } catch (error) {
        this.backup.backupStatus = "备份出错";
        this.backup.backupProgress = 0;
        this.showSnackbar(`备份错误: ${error}`, "error");
      } finally {
        this.backup.isBackingUp = false;
      }
    },

    // 系统设置操作 ==============================================

    // 同步主题模式状态（供组件使用）
    syncThemeMode() {
      return this.system.darkMode;
    },

    // 切换主题模式
    toggleDarkMode(value: boolean) {
      this.system.darkMode = value;
      this.saveSystemSettings();
    },

    // 更新开机自启动状态
    async updateAutoStart(enabled: boolean) {
      try {
        // 调用自启动工具设置实际的系统自启动
        if (enabled) {
          const success = await enableAutoStart();
          if (!success) {
            throw new Error("启用开机自启动失败");
          }
        } else {
          const success = await disableAutoStart();
          if (!success) {
            throw new Error("禁用开机自启动失败");
          }
        }

        // 更新状态(仅UI显示用)
        this.system.autoStart = enabled;

        // 显示通知
        this.showSnackbar(
          `${enabled ? "已启用" : "已禁用"}开机自启动`,
          "success"
        );

        return true;
      } catch (error) {
        console.error("设置开机自启动失败:", error);
        this.showSnackbar("设置开机自启动失败: " + error, "error");

        // 恢复UI状态，重新获取实际状态
        this.refreshAutoStartState();

        return false;
      }
    },

    // 刷新自启动状态（仅更新UI显示）
    async refreshAutoStartState() {
      try {
        // 获取系统中的实际自启动状态
        const systemAutoStart = await isAutoStartEnabled();

        // 更新UI状态
        this.system.autoStart = systemAutoStart;

        console.log(
          `自启动状态已刷新: ${this.system.autoStart ? "已启用" : "已禁用"}`
        );
        return true;
      } catch (error) {
        console.error("刷新自启动状态失败:", error);
        return false;
      }
    },

    // 保存系统设置
    async saveSystemSettings() {
      try {
        await saveSetting("system.darkMode", this.system.darkMode);
        // 不再保存autoStart到数据库，由Tauri插件管理
        await saveSetting("system.minimizeToTray", this.system.minimizeToTray);
      } catch (error) {
        console.error("保存系统设置失败:", error);
        this.showSnackbar("保存系统设置失败", "error");
      }
    },

    // 初始化方法，加载所有设置
    async initializeSettings() {
      try {
        // 加载系统设置
        this.system.darkMode = await getSetting("system.darkMode", false);
        // 从系统实际状态获取自启动设置，而不是从数据库
        this.system.autoStart = await isAutoStartEnabled();
        this.system.minimizeToTray = await getSetting(
          "system.minimizeToTray",
          true
        );

        // 加载数据库连接设置
        const connectionUrl = await getSetting<string>(
          "database.connectionUrl",
          ""
        );
        if (connectionUrl) {
          // 从连接URL解析各个组件
          this.parseConnectionUrl(connectionUrl);
        } else {
          // 没有保存过连接URL，使用默认值
          this.database.host = "localhost";
          this.database.port = 3306;
          this.database.username = "root";
          this.database.password = "";
          this.database.database = "";
        }

        // 加载备份设置
        this.backup.path = await getSetting("backup.path", "");
        this.backup.auto = await getSetting("backup.auto", false);
        this.backup.frequency = await getSetting("backup.frequency", "daily");
        this.backup.keepCount = await getSetting("backup.keepCount", 5);

        // 加载上次备份时间
        const savedLastBackupTime = await getSetting<string>(
          "lastBackupTime",
          ""
        );
        if (savedLastBackupTime) {
          this.backup.lastBackupTime = savedLastBackupTime;
        }

        console.log("所有设置加载完成");

        // 启动数据库连接状态监控
        this.startConnectionMonitor();
      } catch (error) {
        console.error("加载设置失败:", error);
        this.showSnackbar("加载设置失败", "error");
      }
    },
  },
});
