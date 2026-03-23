use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle().clone();
      
      // Check for updates in background
      tauri::async_runtime::spawn(async move {
        match check_for_updates(handle).await {
          Ok(_) => println!("Update check completed"),
          Err(e) => eprintln!("Update check failed: {}", e),
        }
      });
      
      Ok(())
    })
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  println!("Checking for updates...");
  
  let updater = app.updater_builder().build()?;
  
  match updater.check().await {
    Ok(Some(update)) => {
      println!("Update available: {} -> {}", update.current_version, update.version);
      
      // Download and install the update
      let mut downloaded = 0;
      
      let bytes = update.download(
        |chunk_length, content_length| {
          downloaded += chunk_length;
          println!("Downloaded {} of {:?}", downloaded, content_length);
        },
        || {
          println!("Download finished");
        },
      ).await?;
      
      println!("Installing update...");
      update.install(bytes)?;
      
      println!("Update installed. Restart the app to apply changes.");
      
      // Optionally restart the app
      // app.restart();
    }
    Ok(None) => {
      println!("No update available - already on latest version");
    }
    Err(e) => {
      eprintln!("Error checking for updates: {}", e);
    }
  }
  
  Ok(())
}
