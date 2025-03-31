// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use hex;
use mysql::{prelude::*, OptsBuilder, Pool, PooledConn};
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::process::Command;
use tauri::command;
use tempfile::TempDir;
use zip::write::{FileOptions, ZipWriter};

#[command]
fn backup_mysql(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    database: &str,
    output_path: &str,
) -> Result<String, String> {
    // 首先尝试使用系统中安装的mysqldump
    if is_mysqldump_available() {
        return backup_with_mysqldump(host, port, username, password, database, output_path);
    }

    // 如果系统中没有安装mysqldump，使用内置的MySQL备份功能
    return backup_with_rust_mysql(host, port, username, password, database, output_path);
}

// 检查系统中是否有mysqldump可用
fn is_mysqldump_available() -> bool {
    // 根据操作系统不同，执行不同的命令检查mysqldump是否可用
    #[cfg(target_os = "windows")]
    {
        // Windows下检查mysqldump.exe是否存在于PATH中
        let result = Command::new("where").arg("mysqldump").output();
        match result {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux/macOS下使用which命令检查
        let result = Command::new("which").arg("mysqldump").output();
        match result {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }
}

// 使用系统中的mysqldump命令进行备份
fn backup_with_mysqldump(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    database: &str,
    output_path: &str,
) -> Result<String, String> {
    // 确保输出目录存在
    if let Some(parent) = Path::new(output_path).parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("创建输出目录失败: {}", e));
            }
        }
    }

    // 创建临时目录用于存放mysqldump生成的SQL文件
    let temp_dir = match TempDir::new() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("创建临时目录失败: {}", e)),
    };

    // 获取临时SQL文件路径
    let sql_file_path = temp_dir.path().join("full_backup.sql");
    let sql_file_path_str = sql_file_path.to_string_lossy().to_string();

    // 构建 mysqldump 命令
    let mut cmd = Command::new("mysqldump");
    cmd.arg(format!("--host={}", host))
        .arg(format!("--port={}", port))
        .arg(format!("--user={}", username));

    // 如果密码不为空，则添加密码参数
    if !password.is_empty() {
        cmd.arg(format!("--password={}", password));
    }

    // 添加其他有用的参数
    cmd.arg("--add-drop-database")
        .arg("--add-drop-table")
        .arg("--triggers")
        .arg("--routines")
        .arg("--events")
        .arg("--single-transaction")
        .arg("--databases")
        .arg(database)
        .arg("--result-file")
        .arg(&sql_file_path_str);

    // 执行命令
    match cmd.output() {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("备份失败: {}", stderr));
            }
        }
        Err(e) => {
            return Err(format!("执行mysqldump命令失败: {}", e));
        }
    }

    // 创建ZIP文件
    let zip_file = match File::create(output_path) {
        Ok(file) => file,
        Err(e) => return Err(format!("创建ZIP文件失败: {}", e)),
    };

    let mut zip = ZipWriter::new(zip_file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    // 添加SQL文件到ZIP
    if let Err(e) = zip.start_file("mysqldump_backup.sql", options) {
        return Err(format!("添加备份文件到ZIP失败: {}", e));
    }

    let sql_content = match fs::read(&sql_file_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("读取备份文件失败: {}", e)),
    };

    if let Err(e) = zip.write_all(&sql_content) {
        return Err(format!("写入备份数据到ZIP失败: {}", e));
    }

    // 完成ZIP文件
    if let Err(e) = zip.finish() {
        return Err(format!("完成ZIP文件失败: {}", e));
    }

    Ok(output_path.to_string())
}

// 使用Rust MySQL库进行备份（内置备份方式）
fn backup_with_rust_mysql(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    database: &str,
    output_path: &str,
) -> Result<String, String> {
    // 检查输出路径
    let output_file_path = Path::new(output_path);

    // 确保输出目录存在
    if let Some(parent) = output_file_path.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Err(format!("创建输出目录失败: {}", e));
            }
        }
    }

    // 创建临时目录用于存放每个表的备份文件
    let temp_dir = match TempDir::new() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("创建临时目录失败: {}", e)),
    };

    // 构建连接选项
    let opts = OptsBuilder::new()
        .ip_or_hostname(Some(host))
        .tcp_port(port)
        .user(Some(username))
        .pass(Some(password))
        .db_name(Some(database));

    // 创建数据库连接
    let pool = match Pool::new(opts) {
        Ok(pool) => pool,
        Err(e) => return Err(format!("连接数据库失败: {}", e)),
    };

    // 获取连接
    let mut conn = match pool.get_conn() {
        Ok(conn) => conn,
        Err(e) => return Err(format!("获取数据库连接失败: {}", e)),
    };

    // 创建数据库信息文件
    let db_info_path = temp_dir.path().join("00_database_info.sql");
    let mut db_info_file = match File::create(&db_info_path) {
        Ok(file) => file,
        Err(e) => return Err(format!("创建数据库信息文件失败: {}", e)),
    };

    // 写入数据库信息
    if let Err(e) = writeln!(db_info_file, "-- MySQL dump by Rust mysql-client") {
        return Err(format!("写入文件失败: {}", e));
    }
    if let Err(e) = writeln!(db_info_file, "-- Database: {}", database) {
        return Err(format!("写入文件失败: {}", e));
    }
    if let Err(e) = writeln!(db_info_file, "\n-- 创建数据库\nCREATE DATABASE IF NOT EXISTS `{}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\nUSE `{}`;\n", database, database) {
        return Err(format!("写入文件失败: {}", e));
    }

    // 获取所有表名
    let tables: Vec<String> = match conn.query("SHOW TABLES") {
        Ok(result) => result,
        Err(e) => return Err(format!("获取表列表失败: {}", e)),
    };

    // 遍历每张表进行备份
    for table in &tables {
        let table_file_name = format!("table_{}.sql", table);
        let table_file_path = temp_dir.path().join(&table_file_name);

        // 创建表备份文件
        let mut table_file = match File::create(&table_file_path) {
            Ok(file) => file,
            Err(e) => return Err(format!("创建表备份文件失败: {}", e)),
        };

        // 备份表结构
        if let Err(e) = backup_table_structure(&mut conn, &mut table_file, table) {
            return Err(e);
        }

        // 备份表数据
        if let Err(e) = backup_table_data(&mut conn, &mut table_file, table) {
            return Err(e);
        }
    }

    // 创建ZIP文件
    let zip_file = match File::create(output_path) {
        Ok(file) => file,
        Err(e) => return Err(format!("创建ZIP文件失败: {}", e)),
    };

    let mut zip = ZipWriter::new(zip_file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    // 首先添加数据库信息文件
    if let Err(e) = zip.start_file("00_database_info.sql", options) {
        return Err(format!("添加数据库信息到ZIP失败: {}", e));
    }

    let db_info_content = match fs::read(&db_info_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("读取数据库信息文件失败: {}", e)),
    };

    if let Err(e) = zip.write_all(&db_info_content) {
        return Err(format!("写入数据库信息到ZIP失败: {}", e));
    }

    // 添加所有表文件到ZIP
    for table in &tables {
        let table_file_name = format!("table_{}.sql", table);
        let table_file_path = temp_dir.path().join(&table_file_name);

        // 添加到ZIP
        if let Err(e) = zip.start_file(&table_file_name, options) {
            return Err(format!("添加表文件到ZIP失败: {}", e));
        }

        let table_content = match fs::read(&table_file_path) {
            Ok(content) => content,
            Err(e) => return Err(format!("读取表备份文件失败: {}", e)),
        };

        if let Err(e) = zip.write_all(&table_content) {
            return Err(format!("写入表数据到ZIP失败: {}", e));
        }
    }

    // 完成ZIP文件
    if let Err(e) = zip.finish() {
        return Err(format!("完成ZIP文件失败: {}", e));
    }

    Ok(output_path.to_string())
}

// 备份表结构
fn backup_table_structure(
    conn: &mut PooledConn,
    output_file: &mut fs::File,
    table: &str,
) -> Result<(), String> {
    // 获取表结构
    let row = match conn.query_first::<mysql::Row, _>(format!("SHOW CREATE TABLE {}", table)) {
        Ok(Some(row)) => row,
        Ok(None) => return Err(format!("获取表结构失败: 表 {} 不存在", table)),
        Err(e) => return Err(format!("获取表结构失败: {}", e)),
    };

    // 从结果中提取"Create Table"字段
    let create_table: String = match row.get("Create Table") {
        Some(create_sql) => create_sql,
        None => return Err(format!("无法从结果中提取Create Table字段")),
    };

    // 写入表结构
    if let Err(e) = writeln!(output_file, "\n-- 表结构: {}\n", table) {
        return Err(format!("写入文件失败: {}", e));
    }
    if let Err(e) = writeln!(output_file, "DROP TABLE IF EXISTS `{}`;\n", table) {
        return Err(format!("写入文件失败: {}", e));
    }
    if let Err(e) = writeln!(output_file, "{};\n", create_table) {
        return Err(format!("写入文件失败: {}", e));
    }

    Ok(())
}

// 备份表数据
fn backup_table_data(
    conn: &mut PooledConn,
    output_file: &mut fs::File,
    table: &str,
) -> Result<(), String> {
    // 写入表数据开始标记
    if let Err(e) = writeln!(output_file, "\n-- 表数据: {}\n", table) {
        return Err(format!("写入文件失败: {}", e));
    }

    if let Err(e) = writeln!(output_file, "LOCK TABLES `{}` WRITE;", table) {
        return Err(format!("写入文件失败: {}", e));
    }

    // 获取列信息，以便正确处理数据类型
    let mut column_names = Vec::new();
    {
        let columns = match conn.query_iter(format!("SHOW COLUMNS FROM {}", table)) {
            Ok(cols) => cols,
            Err(e) => return Err(format!("获取列信息失败: {}", e)),
        };

        // 列出所有列名
        for col_result in columns {
            let col = match col_result {
                Ok(col) => col,
                Err(e) => return Err(format!("读取列信息失败: {}", e)),
            };

            // 从Row中获取列名（Field字段）
            let col_name: String = match col.get("Field") {
                Some(name) => name,
                None => return Err("无法获取列名".to_string()),
            };

            column_names.push(col_name);
        }
    }

    // 获取表数据
    let rows = match conn.query_iter(format!("SELECT * FROM {}", table)) {
        Ok(rows) => rows,
        Err(e) => return Err(format!("获取表数据失败: {}", e)),
    };

    // 生成INSERT语句
    let mut row_buffer = Vec::new();

    for row_result in rows {
        let row = match row_result {
            Ok(row) => row,
            Err(e) => return Err(format!("读取行数据失败: {}", e)),
        };

        // 处理一行数据
        let mut value_strings = Vec::new();

        for col_name in &column_names {
            let value = match get_escaped_value(&row, col_name) {
                Ok(v) => v,
                Err(e) => return Err(e),
            };

            value_strings.push(value);
        }

        // 将行格式化为：(val1, val2, ...)
        let row_values = format!("({})", value_strings.join(", "));
        row_buffer.push(row_values);

        // 每1000行写入一次
        if row_buffer.len() >= 1000 {
            // 写入INSERT语句
            if let Err(e) = writeln!(
                output_file,
                "INSERT INTO `{}` ({}) VALUES",
                table,
                column_names
                    .iter()
                    .map(|s| format!("`{}`", s))
                    .collect::<Vec<_>>()
                    .join(", ")
            ) {
                return Err(format!("写入文件失败: {}", e));
            }

            // 写入所有行，除了最后一行有不同的结尾
            let last_idx = row_buffer.len() - 1;
            for (i, row_value) in row_buffer.iter().enumerate() {
                if i < last_idx {
                    if let Err(e) = writeln!(output_file, "{},", row_value) {
                        return Err(format!("写入文件失败: {}", e));
                    }
                } else {
                    if let Err(e) = writeln!(output_file, "{};", row_value) {
                        return Err(format!("写入文件失败: {}", e));
                    }
                }
            }

            row_buffer.clear();
        }
    }

    // 处理剩余的行
    if !row_buffer.is_empty() {
        // 写入INSERT语句
        if let Err(e) = writeln!(
            output_file,
            "INSERT INTO `{}` ({}) VALUES",
            table,
            column_names
                .iter()
                .map(|s| format!("`{}`", s))
                .collect::<Vec<_>>()
                .join(", ")
        ) {
            return Err(format!("写入文件失败: {}", e));
        }

        // 写入所有行，除了最后一行有不同的结尾
        let last_idx = row_buffer.len() - 1;
        for (i, row_value) in row_buffer.iter().enumerate() {
            if i < last_idx {
                if let Err(e) = writeln!(output_file, "{},", row_value) {
                    return Err(format!("写入文件失败: {}", e));
                }
            } else {
                if let Err(e) = writeln!(output_file, "{};", row_value) {
                    return Err(format!("写入文件失败: {}", e));
                }
            }
        }
    }

    if let Err(e) = writeln!(output_file, "UNLOCK TABLES;") {
        return Err(format!("写入文件失败: {}", e));
    }

    Ok(())
}

// 处理不同类型的MySQL数据，转换为SQL格式的字符串值
fn get_escaped_value(row: &mysql::Row, column_name: &str) -> Result<String, String> {
    if let Some(val) = row.get_opt(column_name) {
        match val {
            // 处理NULL值
            Ok(mysql::Value::NULL) => {
                return Ok("NULL".to_string());
            }
            // 处理字符串值 - 需要转义
            Ok(mysql::Value::Bytes(bytes)) => {
                let s = match String::from_utf8(bytes.clone()) {
                    Ok(s) => s,
                    Err(_) => {
                        // 处理二进制数据
                        return Ok(format!("0x{}", hex::encode(&bytes)));
                    }
                };

                // 转义MySQL字符串
                let escaped = s.replace("'", "''").replace("\\", "\\\\");
                return Ok(format!("'{}'", escaped));
            }
            // 处理整数值
            Ok(mysql::Value::Int(i)) => {
                return Ok(i.to_string());
            }
            // 处理无符号整数值
            Ok(mysql::Value::UInt(u)) => {
                return Ok(u.to_string());
            }
            // 处理浮点数值
            Ok(mysql::Value::Float(f)) => {
                return Ok(f.to_string());
            }
            // 处理日期时间值
            Ok(mysql::Value::Date(year, month, day, hour, minute, second, micros)) => {
                if hour == 0 && minute == 0 && second == 0 && micros == 0 {
                    // 只有日期
                    return Ok(format!("'{:04}-{:02}-{:02}'", year, month, day));
                } else if micros == 0 {
                    // 日期时间，无微秒
                    return Ok(format!(
                        "'{:04}-{:02}-{:02} {:02}:{:02}:{:02}'",
                        year, month, day, hour, minute, second
                    ));
                } else {
                    // 完整日期时间，带微秒
                    return Ok(format!(
                        "'{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}'",
                        year, month, day, hour, minute, second, micros
                    ));
                }
            }
            // 处理时间值
            Ok(mysql::Value::Time(neg, days, hours, minutes, seconds, micros)) => {
                let sign = if neg { "-" } else { "" };
                if micros == 0 {
                    return Ok(format!(
                        "'{}{:02}:{:02}:{:02}'",
                        sign,
                        hours as u32 + (days as u32 * 24),
                        minutes,
                        seconds
                    ));
                } else {
                    return Ok(format!(
                        "'{}{:02}:{:02}:{:02}.{:06}'",
                        sign,
                        hours as u32 + (days as u32 * 24),
                        minutes,
                        seconds,
                        micros
                    ));
                }
            }
            // 其他类型，转为字符串处理
            Ok(_) => {
                return Ok("NULL".to_string());
            }
            // 错误处理
            Err(e) => {
                return Err(format!("获取列值失败: {}", e));
            }
        }
    } else {
        return Err(format!("列 {} 不存在", column_name));
    }
}

#[command]
fn check_mysqldump_availability() -> bool {
    // 现在总是返回true，因为我们有内置的备份功能
    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            backup_mysql,
            check_mysqldump_availability
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
