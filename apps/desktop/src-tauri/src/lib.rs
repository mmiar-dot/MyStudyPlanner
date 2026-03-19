use tauri::{Manager, WebviewWindow};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Get the main window
      let main_window = app.get_webview_window("main");
      
      // Enable devtools in debug mode
      #[cfg(debug_assertions)]
      {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        
        // Open devtools on the main window
        if let Some(window) = &main_window {
          let _ = window.open_devtools();
        }
      }
      
      // Register global keyboard shortcut for devtools (Cmd+Option+I on macOS)
      if let Some(window) = main_window {
        register_devtools_shortcut(window);
      }
      
      Ok(())
    })
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// Register keyboard shortcut to toggle devtools
fn register_devtools_shortcut(window: WebviewWindow) {
  // Listen for JavaScript events to toggle devtools
  let window_clone = window.clone();
  window.listen("toggle-devtools", move |_| {
    if window_clone.is_devtools_open() {
      window_clone.close_devtools();
    } else {
      window_clone.open_devtools();
    }
  });
}
