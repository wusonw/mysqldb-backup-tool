import Database from "@tauri-apps/plugin-sql";

/** 数据库连接实例 */
let db: Database | null = null;

/**
 * 初始化数据库连接
 * @returns 数据库连接实例
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  try {
    // 直接使用相对路径，这将保存在应用程序的数据目录中
    console.log("尝试连接到SQLite数据库...");

    // 尝试不同的连接格式
    try {
      db = await Database.load("sqlite:settings.db");
      console.log("连接成功：sqlite:settings.db");
    } catch (innerError) {
      console.error("第一种连接格式失败:", innerError);

      try {
        db = await Database.load("sqlite:///settings.db");
        console.log("连接成功：sqlite:///settings.db");
      } catch (innerError2) {
        console.error("第二种连接格式失败:", innerError2);

        // 最后一种尝试
        db = await Database.load("sqlite://settings.db");
        console.log("连接成功：sqlite://settings.db");
      }
    }

    // 初始化数据库表
    await createTables();

    return db;
  } catch (error) {
    console.error("数据库初始化错误:", error);
    throw error;
  }
}

/**
 * 创建必要的数据表
 */
async function createTables(): Promise<void> {
  if (!db) throw new Error("数据库未初始化");

  // 创建设置表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * 保存设置项
 * @param key 设置键
 * @param value 设置值
 */
export async function saveSetting(key: string, value: any): Promise<void> {
  if (!db) await initDatabase();

  // 将对象/数组等类型转换为JSON字符串存储
  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  await db!.execute(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) 
     VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    [key, stringValue]
  );
}

/**
 * 获取设置项
 * @param key 设置键
 * @param defaultValue 默认值（如果设置不存在）
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (!db) await initDatabase();

  const result = await db!.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );

  if (result.length === 0) return defaultValue;

  // 尝试将值解析为JSON对象（如果适用）
  try {
    return JSON.parse(result[0].value) as T;
  } catch {
    return result[0].value as unknown as T;
  }
}

/**
 * 获取所有设置项
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  if (!db) await initDatabase();

  const result = await db!.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings"
  );

  const settings: Record<string, any> = {};

  for (const row of result) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

/**
 * 删除设置项
 * @param key 设置键
 */
export async function deleteSetting(key: string): Promise<void> {
  if (!db) await initDatabase();

  await db!.execute("DELETE FROM settings WHERE key = $1", [key]);
}

/**
 * 清空所有设置
 */
export async function clearAllSettings(): Promise<void> {
  if (!db) await initDatabase();

  await db!.execute("DELETE FROM settings");
}
