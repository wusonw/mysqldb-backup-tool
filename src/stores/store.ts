import { defineStore } from "pinia";
import { saveSetting, getSetting } from "../utils/store";
import Database from "@tauri-apps/plugin-sql";
import { open } from "@tauri-apps/plugin-shell";
import {
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
} from "../utils/autostart";
import {
  backupMysqlDatabase,
  checkMysqldumpAvailability,
  cleanupOldBackups,
} from "../utils/backup";
import { useDateFormat } from "@vueuse/core";
import { sendNotification } from "@tauri-apps/plugin-notification";

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
    keepDays: number; // 保留备份天数，0或负数表示不限制保留期限
    isBackingUp: boolean;
    backupProgress: number;
    backupStatus: string;
    lastBackupTime: string;
    mysqldumpAvailable: boolean; // 此字段表示系统中是否有mysqldump命令可用
    backupEngine: string; // 备份引擎类型：'mysqldump' 或 'builtin'
    currentTableName?: string; // 当前正在备份的表名
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
  progressTimer: number | null; // 备份进度动画定时器
  backupMonitorTimer: number | null; // 自动备份监控定时器
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
export const usePiniaStore = defineStore("main", {
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
      keepDays: 180, // 默认保留180天
      isBackingUp: false,
      backupProgress: 0,
      backupStatus: "点击按钮开始备份",
      lastBackupTime: "",
      mysqldumpAvailable: false,
      backupEngine: "builtin", // 默认使用内置引擎
      currentTableName: undefined,
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
    progressTimer: null,
    backupMonitorTimer: null,
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

    // 启动自动备份监控
    startBackupMonitor() {
      // 如果定时器已存在，先停止
      this.stopBackupMonitor();

      // 启动新的定时器，每10分钟检查一次是否需要自动备份
      this.backupMonitorTimer = window.setInterval(() => {
        this.checkAndAutoBackup();
      }, 10 * 60 * 1000); // 10分钟 = 600000毫秒

      console.log("已启动自动备份监控");
    },

    // 停止自动备份监控
    stopBackupMonitor() {
      if (this.backupMonitorTimer) {
        window.clearInterval(this.backupMonitorTimer);
        this.backupMonitorTimer = null;
        console.log("已停止自动备份监控");
      }
    },

    // 检查并执行自动备份
    async checkAndAutoBackup() {
      // 检查自动备份是否启用
      if (!this.backup.auto) {
        console.log("自动备份未启用，跳过检查");
        return;
      }

      // 检查数据库是否已连接
      if (!this.database.isConnected) {
        console.log("数据库未连接，跳过自动备份");
        return;
      }

      // 检查是否正在进行备份
      if (this.backup.isBackingUp) {
        console.log("备份正在进行中，跳过自动备份检查");
        return;
      }

      // 检查是否设置了备份路径
      if (!this.backup.path) {
        console.log("未设置备份路径，跳过自动备份");
        return;
      }

      try {
        // 获取当前时间
        const now = new Date();

        // 如果没有上次备份时间，直接执行备份
        if (!this.backup.lastBackupTime) {
          console.log("没有上次备份记录，执行首次自动备份");
          await this.startBackup();
          return;
        }

        // 解析上次备份时间
        const lastBackupTime = new Date(this.backup.lastBackupTime);

        // 根据备份频率确定是否需要备份
        let shouldBackup = false;

        switch (this.backup.frequency) {
          case "daily":
            // 检查是否已过去24小时
            shouldBackup =
              now.getTime() - lastBackupTime.getTime() >= 24 * 60 * 60 * 1000;
            break;
          case "weekly":
            // 检查是否已过去7天
            shouldBackup =
              now.getTime() - lastBackupTime.getTime() >=
              7 * 24 * 60 * 60 * 1000;
            break;
          case "monthly":
            // 检查是否已过去30天
            shouldBackup =
              now.getTime() - lastBackupTime.getTime() >=
              30 * 24 * 60 * 60 * 1000;
            break;
          default:
            console.log(
              `未知的备份频率: ${this.backup.frequency}，使用每日备份`
            );
            shouldBackup =
              now.getTime() - lastBackupTime.getTime() >= 24 * 60 * 60 * 1000;
        }

        if (shouldBackup) {
          console.log(`已达到备份频率 ${this.backup.frequency}，开始自动备份`);
          await this.startBackup();
        } else {
          console.log("未达到备份频率，跳过自动备份");
        }
      } catch (error) {
        console.error("自动备份检查出错:", error);
      }
    },

    // 启动进度动画（使用实时进度事件）
    startProgressAnimation() {
      // 如果旧的定时器存在，先清除
      this.stopProgressAnimation();
    },

    // 停止进度动画
    stopProgressAnimation() {
      if (this.progressTimer) {
        window.clearInterval(this.progressTimer);
        this.progressTimer = null;
        console.log("已停止进度动画");
      }
    },

    // 备份操作 ==============================================

    // 保存备份设置
    async saveBackupSettings() {
      try {
        await saveSetting("backup.path", this.backup.path);
        await saveSetting("backup.auto", this.backup.auto);
        await saveSetting("backup.frequency", this.backup.frequency);
        await saveSetting("backup.keepDays", this.backup.keepDays);
        await saveSetting("backup.engine", this.backup.backupEngine);
      } catch (error) {
        console.error("保存备份设置失败:", error);
        this.showSnackbar("保存备份设置失败", "error");
      }
    },

    // 生成唯一的备份文件名
    generateBackupFileName(): string {
      const now = new Date();
      // 使用 useDateFormat 格式化日期为 YYYYMMDDHHmm 格式
      const timestamp = useDateFormat(now, "YYYYMMDDHHmm").value;
      return `BACKUP_${timestamp}.zip`;
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

        // 启动进度动画 - 现在无需启动模拟动画了
        this.startProgressAnimation();

        // 定义进度回调函数
        const progressCallback = (
          percent: number,
          status: string,
          currentTable?: string
        ) => {
          console.log(
            `备份进度: ${percent}%, 状态: ${status}, 当前表: ${
              currentTable || "无"
            }`
          );
          // 更新UI显示的进度
          this.backup.backupProgress = percent;
          // 更新状态文本，只显示状态和表名（如果有）
          this.backup.backupStatus = status;
          this.backup.currentTableName = currentTable;

          // 清除旧状态，避免干扰
          if (this.progressTimer) {
            clearTimeout(this.progressTimer);
            this.progressTimer = null;
          }
        };

        // 执行MySQL备份
        try {
          await backupMysqlDatabase(
            this.database.host,
            this.database.port,
            this.database.username,
            this.database.password,
            this.database.database,
            backupFilePath,
            progressCallback, // 传递进度回调函数
            this.backup.backupEngine // 传递备份引擎设置
          );

          // 备份完成
          this.updateBackupProgress(100);
          this.backup.backupStatus = "备份完成";
          this.backup.lastBackupTime = new Date().toLocaleString();

          // 保存最后备份时间到数据库
          await saveSetting("lastBackupTime", this.backup.lastBackupTime);

          // 清理旧备份文件
          try {
            const deletedCount = await cleanupOldBackups(
              this.backup.path,
              this.backup.keepDays
            );
            if (deletedCount > 0) {
              console.log(`已清理 ${deletedCount} 个过期备份文件`);
            }
          } catch (cleanupError) {
            console.error("清理旧备份文件失败:", cleanupError);
            // 清理失败不影响备份流程，所以不抛出错误
          }

          // 显示成功提示
          this.showSnackbar(
            `数据库备份成功，已保存到:\n${backupFilePath}`,
            "success"
          );

          // 发送系统通知
          sendNotification({
            title: "MySQL备份完成",
            body: `数据库 ${this.database.database} 备份已完成！\n文件已保存到: ${backupFilePath}`,
            icon: "icon.png", // 使用应用图标
          });
        } catch (error) {
          throw new Error(`MySQL备份失败: ${error}`);
        }
      } catch (error) {
        this.backup.backupStatus = "备份出错";
        this.backup.backupProgress = 0;
        this.showSnackbar(`备份错误: ${error}`, "error");

        // 备份失败也发送通知
        try {
          await sendNotification({
            title: "MySQL备份失败",
            body: `数据库 ${this.database.database} 备份失败: ${error}`,
            icon: "icon.png",
          });
        } catch (notifyError) {
          console.error("发送失败通知出错:", notifyError);
        }
      } finally {
        // 确保停止进度动画
        this.stopProgressAnimation();
        this.backup.isBackingUp = false;
      }
    },

    // 检查mysqldump可用性
    async checkMysqldumpAvailability() {
      try {
        // 调用实际的命令检查mysqldump是否可用
        this.backup.mysqldumpAvailable = await checkMysqldumpAvailability();
        console.log(
          `mysqldump可用性: ${
            this.backup.mysqldumpAvailable ? "可用" : "不可用"
          }`
        );
        return this.backup.mysqldumpAvailable;
      } catch (error) {
        console.error("检查mysqldump可用性失败:", error);
        this.backup.mysqldumpAvailable = false;
        return false;
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
        this.backup.keepDays = await getSetting("backup.keepDays", 180);

        // 检查mysqldump可用性
        await this.checkMysqldumpAvailability();

        // 加载备份引擎设置（如果mysqldump不可用，则强制使用内置引擎）
        this.backup.backupEngine = await getSetting("backup.engine", "builtin");
        if (
          !this.backup.mysqldumpAvailable &&
          this.backup.backupEngine === "mysqldump"
        ) {
          console.log("系统中没有mysqldump可用，强制使用内置引擎");
          this.backup.backupEngine = "builtin";
          await saveSetting("backup.engine", "builtin");
        }

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

        // 启动自动备份监控
        this.startBackupMonitor();
      } catch (error) {
        console.error("加载设置失败:", error);
        this.showSnackbar("加载设置失败", "error");
      }
    },
  },
});
