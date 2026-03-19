#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| {
      // Enable devtools in debug mode - auto-opens on launch
      #[cfg(debug_assertions)]
      {
        if let Some(window) = _app.get_webview_window("main") {
          let _ = window.open_devtools();
        }
      }
      
      Ok(())
    })
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
