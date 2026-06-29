// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

mod db;
mod sandbox;

struct AppState {
    db: Mutex<db::Database>,
}

#[tauri::command]
async fn execute_code(language: String, code: String) -> Result<sandbox::ExecutionResult, String> {
    sandbox::execute_in_sandbox(&language, &code).await
}

#[tauri::command]
fn save_board(
    id: String,
    name: String,
    data: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_board(&id, &name, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_board(
    id: String,
    state: tauri::State<AppState>,
) -> Result<Option<(String, String)>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_board(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_boards(
    state: tauri::State<AppState>,
) -> Result<Vec<db::BoardSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_boards().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_board(
    id: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_board(&id).map_err(|e| e.to_string())
}

fn main() {
    // Ensure data directory exists
    let db_dir = dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".devboard");
    std::fs::create_dir_all(&db_dir).expect("Failed to create data directory");

    let db_path = db_dir.join("devboard.db");
    let database = db::Database::open(&db_path)
        .expect("Failed to open database");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(database),
        })
        .invoke_handler(tauri::generate_handler![
            execute_code,
            save_board,
            load_board,
            list_boards,
            delete_board,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
