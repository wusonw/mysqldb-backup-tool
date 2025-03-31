import { invoke } from "@tauri-apps/api/core";

/**
 * 执行MySQL数据库备份
 * 使用内置的备份功能或系统中的mysqldump（如果可用）
 * @param host 数据库主机地址
 * @param port 数据库端口
 * @param username 数据库用户名
 * @param password 数据库密码
 * @param database 要备份的数据库名
 * @param outputPath 备份文件输出路径
 * @returns 成功时返回备份文件路径，失败时抛出错误
 */
export async function backupMysqlDatabase(
  host: string,
  port: number,
  username: string,
  password: string,
  database: string,
  outputPath: string
): Promise<string> {
  try {
    console.log(`开始备份MySQL数据库: ${database}`);
    console.log(
      `参数: ${host}:${port}, 用户: ${username}, 输出: ${outputPath}`
    );

    const result = await invoke<string>("backup_mysql", {
      host,
      port,
      username,
      password,
      database,
      outputPath,
    });

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
    console.error("检查备份功能可用性失败:", error);
    // 即使发生错误，由于我们有内置备份功能，也返回true
    return true;
  }
}
