// AudioWorklet that captures the input channels into a rolling buffer
// and either passes the audio through or sinks it.
// Posts a snapshot of the rolling buffer at ~30 Hz.

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.tag = o.tag || 'cap';
    this.size = o.size || 16384;
    this.passThrough = o.passThrough !== false;
    this.postIntervalSec = o.postIntervalSec || 0.033;
    this.left  = new Float32Array(this.size);
    this.right = new Float32Array(this.size);
    this.writePos = 0;
    this.samplesSincePost = 0;
    this.intervalSamples = Math.floor(this.postIntervalSec * sampleRate);
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0) return true;
    const L = input[0];
    const R = input[1] || input[0];
    const len = L.length;

    if (this.passThrough && output && output.length) {
      const oL = output[0], oR = output[1] || output[0];
      for (let i = 0; i < len; i++) { oL[i] = L[i]; if (oR !== oL) oR[i] = R[i]; }
    }

    let wp = this.writePos;
    const sz = this.size;
    for (let i = 0; i < len; i++) {
      this.left[wp]  = L[i];
      this.right[wp] = R[i];
      wp++; if (wp >= sz) wp = 0;
    }
    this.writePos = wp;

    this.samplesSincePost += len;
    if (this.samplesSincePost >= this.intervalSamples) {
      this.samplesSincePost = 0;
      const l = new Float32Array(sz), r = new Float32Array(sz);
      // unwrap so newest sample is at index sz-1
      const head = wp;
      l.set(this.left.subarray(head), 0);
      l.set(this.left.subarray(0, head), sz - head);
      r.set(this.right.subarray(head), 0);
      r.set(this.right.subarray(0, head), sz - head);
      this.port.postMessage({ tag: this.tag, sr: sampleRate, l, r, writeHead: sz }, [l.buffer, r.buffer]);
    }
    return true;
  }
}

registerProcessor('faust-capture', CaptureProcessor);
