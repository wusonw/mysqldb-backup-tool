/**
 * 简单的加密工具模块
 * 注意：这只是一个基本实现，生产环境建议使用更强大的加密库
 */

// 加密密钥 (实际应用中应从环境变量或配置中获取)
const SECRET_KEY = "MySql_B@ckup_T00l_S3cr3t_K3y";

/**
 * 简单的XOR加密函数
 * @param text 要加密的文本
 * @returns 加密后的文本
 */
export function encrypt(text: string): string {
  if (!text) return text;
  console.log(`加密前的原始文本: "${text}"`);

  try {
    // 将文本转换为Base64，以便处理各种字符
    const base64 = btoa(encodeURIComponent(text));
    let result = "";

    for (let i = 0; i < base64.length; i++) {
      // 使用密钥字符和位置进行XOR运算
      const charCode =
        base64.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }

    // 返回Base64编码的加密结果，确保安全存储
    const encrypted = btoa(result);
    console.log(`加密后的文本: "${encrypted}"`);
    return encrypted;
  } catch (error) {
    console.error("加密过程出错:", error);
    // 如果加密失败，返回原始文本并添加标记，便于调试
    return `[ENCRYPT_FAILED]${text}`;
  }
}

/**
 * 简单的XOR解密函数
 * @param encryptedText 已加密的文本
 * @returns 解密后的文本
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  // 检查是否是加密失败的标记文本
  if (encryptedText.startsWith("[ENCRYPT_FAILED]")) {
    return encryptedText.substring("[ENCRYPT_FAILED]".length);
  }

  console.log(`解密前的加密文本: "${encryptedText}"`);

  try {
    // 解码Base64得到加密字符串
    const encrypted = atob(encryptedText);
    let result = "";

    for (let i = 0; i < encrypted.length; i++) {
      // 使用与加密相同的XOR运算解密
      const charCode =
        encrypted.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }

    // 解码Base64，然后处理URL编码
    const decrypted = decodeURIComponent(atob(result));
    console.log(`解密后的原始文本: "${decrypted}"`);
    return decrypted;
  } catch (error) {
    console.error("解密过程出错:", error, "原文本:", encryptedText);
    return encryptedText; // 如果解密失败，返回原始文本
  }
}

/**
 * 检查字符串是否可能是加密值
 * @param text 要检查的文本
 * @returns 是否是加密值
 */
export function isEncrypted(text: string): boolean {
  // 如果是加密失败的标记文本，不认为是加密文本
  if (!text || text.startsWith("[ENCRYPT_FAILED]")) {
    return false;
  }

  // 简单检查是否是Base64格式
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  const result =
    typeof text === "string" && text.length > 16 && base64Regex.test(text);

  // 记录检查结果
  console.log(
    `检查是否是加密文本: "${text.substring(0, 20)}${
      text.length > 20 ? "..." : ""
    }", 结果: ${result}`
  );

  return result;
}

/**
 * 尝试解密文本，不管它是否被识别为加密文本
 * @param text 可能加密的文本
 * @returns 解密后的文本或原文本
 */
export function tryDecrypt(text: string): string {
  if (!text) return text;

  // 检查是否是加密失败的标记文本
  if (text.startsWith("[ENCRYPT_FAILED]")) {
    return text.substring("[ENCRYPT_FAILED]".length);
  }

  console.log(`尝试解密文本: "${text}"`);

  try {
    // 强制尝试解密，即使不确定是否是加密文本
    if (base64Test(text)) {
      try {
        // 解码Base64得到加密字符串
        const encrypted = atob(text);
        let result = "";

        for (let i = 0; i < encrypted.length; i++) {
          // 使用与加密相同的XOR运算解密
          const charCode =
            encrypted.charCodeAt(i) ^
            SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
          result += String.fromCharCode(charCode);
        }

        // 尝试解码Base64，然后处理URL编码
        try {
          const decoded = atob(result);
          const decrypted = decodeURIComponent(decoded);
          console.log(`可能成功解密: "${decrypted}"`);
          return decrypted;
        } catch (e) {
          // 解码失败，可能不是通过我们的加密算法加密的
          console.log("解码Base64失败，返回原文本");
          return text;
        }
      } catch (e) {
        console.log("初始Base64解码失败，返回原文本");
        return text;
      }
    }
    return text;
  } catch (error) {
    console.error("尝试解密过程出错:", error);
    return text; // 如果解密失败，返回原始文本
  }
}

/**
 * 测试字符串是否是有效的Base64编码
 */
function base64Test(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

/**
 * 需要加密的敏感字段前缀
 * 用于识别哪些键表示敏感信息
 */
export const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "apiKey",
  "accessKey",
];

/**
 * 检查键名是否表示敏感信息
 * @param key 键名
 * @returns 是否是敏感信息
 */
export function isSensitiveKey(key: string): boolean {
  const result = SENSITIVE_KEYS.some((prefix) =>
    key.toLowerCase().includes(prefix.toLowerCase())
  );

  console.log(`检查是否是敏感键: "${key}", 结果: ${result}`);
  return result;
}
