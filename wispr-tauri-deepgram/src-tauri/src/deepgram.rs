use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex};

use tokio_tungstenite::{
  connect_async,
  tungstenite::{
    client::IntoClientRequest,
    protocol::Message,
  },
};

#[derive(Clone)]
pub struct DeepgramState {
  inner: Arc<Mutex<Option<DeepgramSession>>>,
}

struct DeepgramSession {
  tx_audio: mpsc::UnboundedSender<Vec<u8>>,
  stop_tx: mpsc::UnboundedSender<()>,
}

#[derive(Serialize, Clone)]
struct TranscriptPayload {
  text: String,
  is_final: bool,
}

impl DeepgramState {
  pub fn new() -> Self {
    Self {
      inner: Arc::new(Mutex::new(None)),
    }
  }

  pub async fn start(&self, app: AppHandle, api_key: String) -> Result<(), String> {
    // ✅ Lock only briefly (no await while holding it)
    {
      let guard = self.inner.lock().await;
      if guard.is_some() {
        return Ok(());
      }
    }

    let (tx_audio, mut rx_audio) = mpsc::unbounded_channel::<Vec<u8>>();
    let (stop_tx, mut stop_rx) = mpsc::unbounded_channel::<()>();

    // ✅ Avoid Url type conflicts: use &str -> IntoClientRequest
   let endpoint = "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&punctuate=true&interim_results=true&endpointing=300&vad_events=true";

    let mut req: http::Request<()> = endpoint
      .into_client_request()
      .map_err(|e| e.to_string())?;

    let auth_value = format!("Token {}", api_key);
    req.headers_mut().insert(
      "Authorization",
      http::HeaderValue::from_str(&auth_value).map_err(|e| e.to_string())?,
    );

    let (ws_stream, _) =
      connect_async(req).await.map_err(|e| format!("WS connect failed: {e}"))?;

    let (mut ws_write, mut ws_read) = ws_stream.split();

    // Reader: Deepgram -> UI
    let app_reader = app.clone();
    tokio::spawn(async move {
      while let Some(msg) = ws_read.next().await {
        match msg {
          Ok(Message::Text(txt)) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
              let is_final = v.get("is_final").and_then(|x| x.as_bool()).unwrap_or(false);

              let transcript = v
                .get("channel")
                .and_then(|c| c.get("alternatives"))
                .and_then(|a| a.get(0))
                .and_then(|a0| a0.get("transcript"))
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();

              if !transcript.trim().is_empty() {
                let _ = app_reader.emit(
                  "dg_transcript",
                  TranscriptPayload { text: transcript, is_final },
                );
              }
            }
          }
          Ok(Message::Close(_)) => break,
          Err(e) => {
            let _ = app_reader.emit("dg_error", format!("Deepgram read error: {e}"));
            break;
          }
          _ => {}
        }
      }
    });

    // Writer: UI audio -> Deepgram
    let app_writer = app.clone();
    tokio::spawn(async move {
      loop {
        tokio::select! {
          _ = stop_rx.recv() => {
            
            
            // Ask Deepgram to finalize any buffered audio
let _ = ws_write.send(Message::Text("{\"type\":\"Finalize\"}".into())).await;
// Then close cleanly
let _ = ws_write.send(Message::Close(None)).await;
break;

          }
          Some(chunk) = rx_audio.recv() => {
            if let Err(e) = ws_write.send(Message::Binary(chunk)).await {
              let _ = app_writer.emit("dg_error", format!("Deepgram send error: {e}"));
              break;
            }
          }
        }
      }
    });

    // ✅ Store session AFTER connect succeeds (lock briefly)
    {
      let mut guard = self.inner.lock().await;
      *guard = Some(DeepgramSession { tx_audio, stop_tx });
    }

    Ok(())
  }

  pub async fn send_audio(&self, chunk: Vec<u8>) -> Result<(), String> {
    let guard = self.inner.lock().await;
    let sess = guard.as_ref().ok_or("Deepgram not started")?;
    sess.tx_audio.send(chunk).map_err(|_| "Audio channel closed".to_string())
  }

  pub async fn stop(&self) -> Result<(), String> {
    let mut guard = self.inner.lock().await;
    if let Some(sess) = guard.take() {
      let _ = sess.stop_tx.send(());
    }
    Ok(())
  }
}



