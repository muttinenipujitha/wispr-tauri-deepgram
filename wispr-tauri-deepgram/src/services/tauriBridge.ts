import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type TranscriptEvent = { text: string; is_final: boolean };

export async function startDeepgram() {
  return invoke("dg_start");
}

export async function sendAudioChunk(chunk: Uint8Array) {
  return invoke("dg_send_audio", { chunk: Array.from(chunk) });
}

export async function stopDeepgram() {
  return invoke("dg_stop");
}

export async function onTranscript(cb: (t: TranscriptEvent) => void) {
  const unlisten = await listen("dg_transcript", (event) => {
    cb(event.payload as TranscriptEvent);
  });
  return unlisten;
}

export async function onError(cb: (msg: string) => void) {
  const unlisten = await listen("dg_error", (event) => {
    cb(String(event.payload));
  });
  return unlisten;
}
