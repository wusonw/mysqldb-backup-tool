import { Store } from "@tauri-apps/plugin-store";
import { encrypt, isSensitiveKey, isEncrypted, tryDecrypt } from "./crypto";

// 存储实例
let store: Store | null = null;

/**
 * 初始化存储
 */
export async function initStore(): Promise<void> {
  try {
    // 创建并加载存储实例
    store = await Store.load(".settings.dat");
    console.log("存储初始化成功");
  } catch (error) {
    console.error("存储初始化失败:", error);
  }
}

/**
 * 保存设置项
 * @param key 设置键
 * @param value 设置值
 */
export async function saveSetting(key: string, value: any): Promise<void> {
  try {
    if (!store) {
      await initStore();
    }

    // 将对象/数组等类型转换为JSON字符串存储
    let stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    // 检查是否需要加密
    const needsEncryption =
      isSensitiveKey(key) || key === "database.connectionUrl";

    // 对敏感信息进行加密
    if (needsEncryption && stringValue) {
      // 数据库连接URL特殊处理
      if (key === "database.connectionUrl") {
        console.log(`准备加密数据库连接URL, 原始长度: ${stringValue.length}`);
        stringValue = encrypt(stringValue);
        console.log(`数据库连接URL加密完成, 加密后长度: ${stringValue.length}`);
      }
      // 密码类型做特殊处理
      else if (key.toLowerCase().includes("password")) {
        console.log(`准备加密密码: ${key}, 原始值长度: ${stringValue.length}`);
        stringValue = encrypt(stringValue);
        console.log(
          `密码加密完成: ${key}, 加密后的值长度: ${stringValue.length}`
        );
      }
      // 其他敏感字段
      else {
        console.log(`准备加密敏感信息: ${key}, 原始值: "${stringValue}"`);
        stringValue = encrypt(stringValue);
        console.log(`加密完成: ${key}, 加密后的值: "${stringValue}"`);
      }
    }

    // 保存值
    await store?.set(key, stringValue);
    await store?.save();
    console.log(`成功保存设置: ${key}`);
  } catch (error) {
    console.error(`保存设置失败: ${key}`, error);
    throw error;
  }
}

/**
 * 获取设置项
 * @param key 设置键
 * @param defaultValue 默认值
 * @returns 设置值
 */
export async function getSetting<T>(key: string, defaultValue?: T): Promise<T> {
  try {
    if (!store) {
      await initStore();
    }

    const value = await store?.get<string>(key);
    console.log(
      `获取设置: ${key}, 原始值类型: ${typeof value}, 是否有值: ${
        value !== null && value !== undefined
      }`
    );

    // 如果没有值，返回默认值
    if (value === null || value === undefined) {
      console.log(`设置项不存在，返回默认值: ${key}, 默认值: ${defaultValue}`);
      return defaultValue as T;
    }

    // 数据库连接URL特殊处理
    if (key === "database.connectionUrl") {
      console.log(
        `数据库连接URL特殊处理, 原始长度: ${(value as string).length}`
      );
      let finalValue = value as string;

      // 检查是否是加密格式
      if (isEncrypted(finalValue)) {
        try {
          finalValue = tryDecrypt(finalValue);
          console.log(
            `数据库连接URL解密成功, 解密后长度: ${finalValue.length}`
          );
        } catch (decryptError) {
          console.error(`数据库连接URL解密失败:`, decryptError);
          // 如果解密失败，返回空字符串
          finalValue = "";
        }
      }

      return finalValue as unknown as T;
    }

    // 密码字段特殊处理
    if (key.toLowerCase().includes("password")) {
      console.log(
        `密码字段特殊处理: ${key}, 原始值长度: ${(value as string).length}`
      );
      let finalValue = value as string;

      // 先检查是否是加密格式
      if (isEncrypted(finalValue)) {
        try {
          finalValue = tryDecrypt(finalValue);
          console.log(
            `密码解密成功: ${key}, 解密后的值长度: ${finalValue.length}`
          );
        } catch (decryptError) {
          console.error(`密码解密失败: ${key}, 错误:`, decryptError);
          // 如果解密失败，返回空密码
          console.log(`解密失败，返回空密码`);
          finalValue = "";
        }
      } else {
        console.log(
          `密码字段未加密或已解密: ${key}, 值长度: ${finalValue.length}`
        );
      }

      return finalValue as unknown as T;
    }

    // 记录原始值用于调试
    if (typeof value === "string") {
      console.log(
        `读取设置项原始值: ${key}, 值: "${value.substring(0, 20)}${
          value.length > 20 ? "..." : ""
        }"`
      );
    } else {
      console.log(`读取设置项原始值: ${key}, 值: ${value}`);
    }

    // 其他敏感字段处理
    const needsDecryption = isSensitiveKey(key);
    let finalValue: any = value;

    if (needsDecryption && isEncrypted(finalValue)) {
      console.log(`尝试解密敏感信息: ${key}`);
      finalValue = tryDecrypt(finalValue);
    }

    // 尝试将JSON字符串解析为对象
    if (typeof finalValue === "string") {
      try {
        return JSON.parse(finalValue);
      } catch {
        // 如果解析失败，就返回字符串
        return finalValue as unknown as T;
      }
    }

    return finalValue as T;
  } catch (error) {
    console.error(`获取设置失败: ${key}`, error);
    return defaultValue as T;
  }
}

/**
 * 获取所有设置项
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  try {
    if (!store) {
      await initStore();
    }

    const keys = await store?.keys();
    const settings: Record<string, any> = {};

    if (keys) {
      for (const key of keys) {
        try {
          settings[key] = await getSetting(key);
        } catch (error) {
          console.error(`获取设置项异常 ${key}:`, error);
        }
      }
    }

    return settings;
  } catch (error) {
    console.error(`获取所有设置失败:`, error);
    return {};
  }
}

/**
 * 删除设置项
 * @param key 设置键
 */
export async function deleteSetting(key: string): Promise<void> {
  try {
    if (!store) {
      await initStore();
    }

    await store?.delete(key);
    await store?.save();
  } catch (error) {
    console.error(`删除设置失败: ${key}`, error);
    throw error;
  }
}

/**
 * 清空所有设置
 */
export async function clearAllSettings(): Promise<void> {
  try {
    if (!store) {
      await initStore();
    }

    await store?.clear();
    await store?.save();
  } catch (error) {
    console.error("清空设置失败:", error);
    throw error;
  }
}
