export type RecorderHandle = {
  start: () => Promise<void>;
  stop: () => void;
};

export function createWorkletRecorder(onChunk: (chunk: Uint8Array) => void): RecorderHandle {
  let audioCtx: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioWorkletNode | null = null;

  return {
    async start() {
      // Prevent double-start
      if (audioCtx) return;

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create a REAL AudioContext instance (local variable prevents race/null issues)
      const ctx = new AudioContext();
      audioCtx = ctx;

      // Some environments need the URL as a string (href)
      const workletUrl = new URL("../worklets/pcm16-processor.js", import.meta.url);

      // Load processor first
      await ctx.audioWorklet.addModule(workletUrl.href);

      // Now create node using the same ctx (guaranteed BaseAudioContext)
      const workletNode = new AudioWorkletNode(ctx, "pcm16-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
       processorOptions: { targetSampleRate: 16000, chunkMs: 200 }
      });
      node = workletNode;

      workletNode.port.onmessage = (e) => {
        const ab: ArrayBuffer = e.data;
        const chunk = new Uint8Array(ab);

        // Debug (optional): should be ~1920 bytes for 60ms @ 16kHz PCM16 mono
        // console.log("[worklet] chunk bytes:", chunk.length);

        onChunk(chunk);
      };

      source = ctx.createMediaStreamSource(stream);
      source.connect(workletNode);

      // Some systems start AudioContext suspended until user gesture
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    },

    stop() {
      try { node?.disconnect(); } catch {}
      try { source?.disconnect(); } catch {}

      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});

      node = null;
      source = null;
      stream = null;
      audioCtx = null;
    }
  };
}

