#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Always enable devtools for debugging
      #[cfg(debug_assertions)]
      {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Open devtools on all windows in debug mode
      #[cfg(debug_assertions)]
      {
        for (_, window) in app.webview_windows() {
          window.open_devtools();
        }
      }
      
      Ok(())
    })
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
