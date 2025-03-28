import Database from "@tauri-apps/plugin-sql";
import {
  encrypt,
  decrypt,
  isSensitiveKey,
  isEncrypted,
  tryDecrypt,
} from "./crypto";

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

  // 检查是否需要加密
  const needsEncryption = isSensitiveKey(key);

  // 将对象/数组等类型转换为JSON字符串存储
  let stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  // 对敏感信息进行加密
  if (needsEncryption && stringValue) {
    console.log(`准备加密敏感信息: ${key}, 原始值: "${stringValue}"`);
    stringValue = encrypt(stringValue);
    console.log(`加密完成: ${key}, 加密后的值: "${stringValue}"`);
  }

  try {
    await db!.execute(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [key, stringValue]
    );
    console.log(`成功保存设置: ${key}`);
  } catch (error) {
    console.error(`保存设置失败: ${key}`, error);
    throw error;
  }
}

/**
 * 获取设置项
 * @param key 设置键
 * @param defaultValue 默认值（如果设置不存在）
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  if (!db) await initDatabase();

  try {
    const result = await db!.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = $1",
      [key]
    );

    if (result.length === 0) {
      console.log(`设置项不存在，使用默认值: ${key}`);
      return defaultValue;
    }

    // 获取值
    let value = result[0].value;
    console.log(`从数据库获取到设置: ${key}, 原始值: "${value}"`);

    // 对密码字段特殊处理 - 强制尝试解密
    if (key.toLowerCase().includes("password")) {
      console.log(`密码字段特殊处理: ${key}`);
      try {
        // 先保存原始值以便比较
        const origValue = value;

        // 尝试强制解密
        value = tryDecrypt(origValue);
        console.log(`强制解密结果: "${value}"`);

        // 如果解密结果与原值相同，可能不是加密文本
        if (value === origValue && isEncrypted(value)) {
          console.log(`强制解密可能失败，尝试常规解密...`);
          value = decrypt(origValue);
        }
      } catch (decryptError) {
        console.error(`解密过程出错: ${key}`, decryptError);
      }
    }
    // 常规敏感信息处理
    else if (isSensitiveKey(key)) {
      // 检查是否需要解密
      const needsDecryption = isEncrypted(value);

      // 对敏感信息进行解密
      if (needsDecryption) {
        console.log(`需要解密: ${key}`);
        value = decrypt(value);
        console.log(`解密完成: ${key}, 解密后的值: "${value}"`);
      } else {
        console.log(`敏感信息但不需要解密(可能是首次设置或未加密): ${key}`);
      }
    }

    // 尝试将值解析为JSON对象（如果适用）
    try {
      const parsedValue = JSON.parse(value) as T;
      console.log(`成功解析JSON: ${key}`);
      return parsedValue;
    } catch {
      console.log(`非JSON值，直接返回: ${key}`);
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`获取设置失败: ${key}`, error);
    return defaultValue;
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
      // 检查是否需要解密
      const needsDecryption = isSensitiveKey(row.key) && isEncrypted(row.value);

      // 获取值，必要时解密
      let value = row.value;
      if (needsDecryption) {
        value = decrypt(value);
      }

      // 尝试解析为JSON对象
      try {
        settings[row.key] = JSON.parse(value);
      } catch {
        settings[row.key] = value;
      }
    } catch (error) {
      console.error(`处理设置项错误 ${row.key}:`, error);
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
