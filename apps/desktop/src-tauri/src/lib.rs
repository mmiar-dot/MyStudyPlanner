use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| {
      // Devtools can be opened manually with keyboard shortcut (Cmd+Alt+I on macOS, Ctrl+Shift+I on Windows/Linux)
      // Removed automatic opening of devtools
      Ok(())
    })
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
