// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(windows, windows_subsystem = "windows")]

fn main() {
    mysql_backup_tool_lib::run()
}
