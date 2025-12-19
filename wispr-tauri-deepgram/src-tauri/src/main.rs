mod deepgram;

use deepgram::DeepgramState;
use tauri::State;

#[tauri::command]
async fn dg_start(app: tauri::AppHandle, dg: State<'_, DeepgramState>) -> Result<(), String> {
  let api_key = std::env::var("DEEPGRAM_API_KEY")
    .map_err(|_| "Missing DEEPGRAM_API_KEY (set it in your environment)".to_string())?;
  dg.start(app, api_key).await
}

#[tauri::command]
async fn dg_send_audio(dg: State<'_, DeepgramState>, chunk: Vec<u8>) -> Result<(), String> {
  dg.send_audio(chunk).await
}

#[tauri::command]
async fn dg_stop(dg: State<'_, DeepgramState>) -> Result<(), String> {
  dg.stop().await
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .manage(DeepgramState::new())
    .invoke_handler(tauri::generate_handler![dg_start, dg_send_audio, dg_stop])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
