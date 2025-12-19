// AudioWorkletProcessor: converts incoming Float32 samples to 16kHz PCM16.
// Sends ArrayBuffer chunks back to main thread via port.postMessage(buffer).

class PCM16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetSampleRate = opts.targetSampleRate || 16000;
    this.chunkMs = opts.chunkMs || 60;

    this.inputSampleRate = sampleRate;
    this.step = this.inputSampleRate / this.targetSampleRate; // fractional-safe

    this.chunkSamples = Math.max(
      160,
      Math.round(this.targetSampleRate * (this.chunkMs / 1000))
    );

    this.out = new Int16Array(this.chunkSamples);
    this.outIndex = 0;

    // fractional position inside the current input buffer
    this.pos = 0;
  }

  floatToI16(f) {
    const s = Math.max(-1, Math.min(1, f));
    return s < 0 ? (s * 0x8000) : (s * 0x7fff);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const x = input[0]; // mono Float32Array

    // Resample using nearest-neighbor (fast + stable) for voice prototype
    while (this.pos < x.length) {
      const sample = x[Math.floor(this.pos)];
      this.out[this.outIndex++] = this.floatToI16(sample);

      if (this.outIndex >= this.out.length) {
        // Transfer the buffer (smoother)
        const buf = this.out.buffer;
        this.port.postMessage(buf, [buf]);

        // Allocate a new buffer after transfer
        this.out = new Int16Array(this.chunkSamples);
        this.outIndex = 0;
      }

      this.pos += this.step;
    }

    // keep fractional remainder for next process() call
    this.pos -= x.length;
    return true;
  }
}

registerProcessor("pcm16-processor", PCM16Processor);

