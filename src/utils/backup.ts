import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// 定义进度更新回调函数类型
export type ProgressCallback = (
  percent: number,
  status: string,
  currentTable?: string
) => void;

/**
 * 执行MySQL数据库备份
 * 使用内置的备份功能或系统中的mysqldump（如果可用）
 * @param host 数据库主机地址
 * @param port 数据库端口
 * @param username 数据库用户名
 * @param password 数据库密码
 * @param database 要备份的数据库名
 * @param outputPath 备份文件输出路径
 * @param progressCallback 进度更新回调函数
 * @param engine 备份引擎类型，'mysqldump'或'builtin'
 * @returns 成功时返回备份文件路径，失败时抛出错误
 */
export async function backupMysqlDatabase(
  host: string,
  port: number,
  username: string,
  password: string,
  database: string,
  outputPath: string,
  progressCallback?: ProgressCallback,
  engine?: string
): Promise<string> {
  try {
    console.log(`开始备份MySQL数据库: ${database}`);
    console.log(
      `参数: ${host}:${port}, 用户: ${username}, 输出: ${outputPath}, 引擎: ${
        engine || "自动"
      }`
    );

    // 注册进度更新事件监听器
    let unlisten: (() => void) | null = null;

    if (progressCallback) {
      unlisten = await listen("backup-progress", (event) => {
        const payload = event.payload as {
          percent: number;
          status: string;
          current_table?: string;
        };

        // 调用回调函数更新进度
        progressCallback(
          payload.percent,
          payload.status,
          payload.current_table
        );
      });
    }

    // 调用Rust函数执行备份
    const result = await invoke<string>("backup_mysql", {
      host,
      port,
      username,
      password,
      database,
      outputPath,
      engine, // 传递备份引擎参数
    });

    // 移除事件监听器
    if (unlisten) {
      unlisten();
    }

    console.log(`备份成功: ${result}`);
    return result;
  } catch (error) {
    console.error("备份MySQL数据库失败:", error);
    throw error;
  }
}

/**
 * 检查MySQL备份功能可用性
 * 由于我们实现了内置备份功能，此函数始终返回true
 * @returns 总是返回true，表示备份功能可用
 */
export async function checkMysqldumpAvailability(): Promise<boolean> {
  try {
    // 调用命令检查备份功能可用性
    const result = await invoke<boolean>("check_mysqldump_availability");
    return result;
  } catch (error) {
    console.error("检查mysqldump可用性失败:", error);
    return false;
  }
}
