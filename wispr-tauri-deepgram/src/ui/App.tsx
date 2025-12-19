import { useEffect, useMemo, useRef, useState } from "react";
import { createWorkletRecorder } from "../audio/workletRecorder";
import {
  onError,
  onTranscript,
  sendAudioChunk,
  startDeepgram,
  stopDeepgram,
} from "../services/tauriBridge";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "error">("idle");
  const [error, setError] = useState("");

  // ✅ Track last final transcript to avoid duplicates
  const lastFinalRef = useRef("");

  const recorder = useMemo(
    () =>
      createWorkletRecorder((chunk) => {
        sendAudioChunk(chunk).catch(() => {});
      }),
    []
  );

  // Listen for backend events
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    onTranscript((t) => {
      if (t.is_final) {
        // ✅ Deduplicate repeated finals
        if (t.text.trim() === lastFinalRef.current.trim()) return;

        lastFinalRef.current = t.text;

        setFinalText((prev) =>
          (prev + (prev ? " " : "") + t.text).trim()
        );
        setPartial("");
      } else {
        setPartial(t.text);
      }
    }).then((u) => unsubs.push(u));

    onError((msg) => {
      setStatus("error");
      setError(msg);
      setRecording(false);
      setConnecting(false);
    }).then((u) => unsubs.push(u));

    return () => unsubs.forEach((u) => u());
  }, []);

  async function start() {
    if (recording || connecting) return;

    setError("");
    setFinalText("");
    setPartial("");
    setConnecting(true);
    setStatus("listening");
    lastFinalRef.current = "";

    try {
      await startDeepgram();
      await recorder.start();
      setRecording(true);
    } catch (e) {
      setStatus("error");
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  }

  async function stop() {
    if (!recording) return;

    recorder.stop();
    await stopDeepgram();

    setRecording(false);
    setStatus("idle");
  }

  // Push-to-talk with Space
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !recording && !connecting) {
        e.preventDefault();
        start().catch(() => {});
      }
    };

    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && recording) {
        e.preventDefault();
        stop().catch(() => {});
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [recording, connecting]);

  const display = (finalText + (partial ? ` ${partial}` : "")).trim();

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h2>Voice to Text (Tauri + Deepgram)</h2>

      <div style={{ marginBottom: 12 }}>
        <button
          onMouseDown={() => start()}
          onMouseUp={() => stop()}
          onMouseLeave={() => stop()}
          disabled={connecting}
          style={{ padding: "10px 14px" }}
        >
          {connecting
            ? "Connecting…"
            : recording
            ? "Recording… (release)"
            : "Hold to Talk"}
        </button>

        <span style={{ marginLeft: 12 }}>
          Status: {status}
          {recording ? " • mic on" : ""}
        </span>
      </div>

      {status === "error" && (
        <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>
      )}

      <textarea
        value={display}
        readOnly
        rows={8}
        style={{ width: "100%", padding: 10 }}
        placeholder="Transcribed text will appear here…"
      />

      <div style={{ marginTop: 10 }}>
        <button
          onClick={async () => {
            const { writeText } = await import(
              "@tauri-apps/plugin-clipboard-manager"
            );
            await writeText(display);
          }}
          style={{ padding: "8px 12px" }}
        >
          Copy
        </button>

        <button
          onClick={() => {
            setFinalText("");
            setPartial("");
            lastFinalRef.current = "";
          }}
          style={{ padding: "8px 12px", marginLeft: 8 }}
        >
          Clear
        </button>
      </div>

      <p style={{ marginTop: 12, opacity: 0.75 }}>
        Tip: hold <b>Space</b> to talk (push-to-talk).
      </p>
    </div>
  );
}


