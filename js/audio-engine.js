/**
 * STUDIO AUDIO ENGINE — Motor Nativo Web Audio API (ES6+)
 * Sistema Multimídia Educacional: Áudio Digital, Música e Voz
 *
 * Recursos implementados sem dependências externas (100% offline):
 * - Desbloqueio seguro de AudioContext na primeira interação do usuário
 * - Barramento master com DynamicsCompressorNode (proteção anti-clipping) e AnalyserNode
 * - Sintetizador Aditivo de 4 Harmônicos (Fourier: f0, 2f0, 3f0, 4f0) com leitura RMS/amostra
 * - Gerador PCM Degradado (Downsampling real + Quantização v-bit audível sem ScriptProcessor)
 * - Cadeia de Equalizador Gráfico de 5 Bandas (BiquadFilterNode reais: 62, 250, 1k, 4k, 16k Hz)
 *   conectada a arquivos de áudio reais (<audio> / AudioBuffer) + AnalyserNode FFT (2048 pts)
 * - Sintetizador MIDI dual-engine: Síntese FM (2 operadores) vs. Síntese PCM (sampler wavetable)
 */

(function (global) {
  'use strict';

  const NOTE_FREQUENCIES = {
    C4: 261.6256,
    D4: 293.6648,
    E4: 329.6276,
    F4: 349.2282,
    G4: 391.9954,
    A4: 440.0,
    B4: 493.8833,
    C5: 523.2511
  };

  const EQ_BAND_CONFIGS = [
    { key: '62',  freq: 62,    type: 'lowshelf',  q: 0.7 },
    { key: '250', freq: 250,   type: 'peaking',   q: 1.1 },
    { key: '1k',  freq: 1000,  type: 'peaking',   q: 1.1 },
    { key: '4k',  freq: 4000,  type: 'peaking',   q: 1.1 },
    { key: '16k', freq: 16000, type: 'highshelf', q: 0.7 }
  ];

  class StudioAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.masterLimiter = null;
      this.masterAnalyser = null;

      // Módulo 1: Síntese Aditiva (Fourier)
      this.fourier = {
        active: false,
        baseFreq: 220,
        amplitudes: [1.0, 0.0, 0.0, 0.0],
        oscs: [],
        gains: [],
        busGain: null,
        analyser: null,
        timeData: null
      };

      // Módulo 2: Audição de Degradação PCM (Downsampler + Bitcrusher)
      this.pcm = {
        active: false,
        sourceNode: null,
        busGain: null,
        signalFreq: 1000,
        sampleRate: 8000,
        bitDepth: 3
      };

      // Módulo 4A: Equalizador Gráfico 5 Bandas + FFT (áudio real da equipe)
      this.eq = {
        active: false,
        filters: {},
        gainsDb: { '62': 0, '250': 0, '1k': 0, '4k': 0, '16k': 0 },
        inputGain: null,
        analyser: null,
        freqData: null,
        sourceType: null, // 'buffer' | 'media'
        bufferSource: null,
        mediaElement: null,
        mediaSourceNode: null,
        bufferCache: new Map(),
        currentUrl: ''
      };

      // Módulo 4B: Síntese MIDI (FM & PCM Sampler)
      this.midi = {
        busGain: null,
        pcmReferenceBuffer: null,
        pcmReferenceFreq: 261.6256 // C4 gravado/amostrado no buffer de referência
      };

      this._setupAutoUnlock();
    }

    /* ======================================================================
       INICIALIZAÇÃO & DESBLOQUEIO SEGURO DO AUDIOCONTEXT
       ====================================================================== */
    _setupAutoUnlock() {
      const unlockHandler = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => this._notifyStatus('active')).catch(() => {});
        }
      };
      ['pointerdown', 'keydown'].forEach((evt) => {
        window.addEventListener(evt, unlockHandler, { passive: true });
      });
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          this._notifyStatus('error', 'Sem Web Audio');
          return null;
        }

        this.ctx = new AudioCtx();

        // Master Chain: masterGain -> DynamicsCompressor (proteção) -> masterAnalyser -> speakers
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;

        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.value = -6;
        this.masterLimiter.knee.value = 6;
        this.masterLimiter.ratio.value = 12;
        this.masterLimiter.attack.value = 0.003;
        this.masterLimiter.release.value = 0.12;

        this.masterAnalyser = this.ctx.createAnalyser();
        this.masterAnalyser.fftSize = 256;

        this.masterGain.connect(this.masterLimiter);
        this.masterLimiter.connect(this.masterAnalyser);
        this.masterAnalyser.connect(this.ctx.destination);

        this._initEqGraph();
        this._initMidiBus();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => this._notifyStatus('active')).catch(() => {});
      } else {
        this._notifyStatus('active');
      }

      return this.ctx;
    }

    _notifyStatus(state, customLabel) {
      if (global.StudioApp && typeof global.StudioApp.setAudioEngineStatus === 'function') {
        const srLabel = this.ctx ? `${(this.ctx.sampleRate / 1000).toFixed(1)} kHz` : 'Ativo';
        global.StudioApp.setAudioEngineStatus(state, customLabel || (state === 'active' ? srLabel : 'Inativo'));
      }
    }

    getSampleRate() {
      return this.ctx ? this.ctx.sampleRate : 44100;
    }

    getOutputLevel() {
      if (!this.masterAnalyser || !this.ctx || this.ctx.state !== 'running') return 0;
      const buf = new Float32Array(this.masterAnalyser.fftSize);
      this.masterAnalyser.getFloatTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      return Math.min(1, Math.sqrt(sumSq / buf.length) * 2.5);
    }

    stopAllContinuous() {
      this.stopFourier();
      this.stopPcmAudio();
      this.stopEqAudio();
    }

    /* ======================================================================
       MÓDULO 1: SÍNTESE ADITIVA (4 HARMÔNICOS DE FOURIER)
       ====================================================================== */
    startFourier(baseFreq, amplitudes) {
      const ctx = this.ensureContext();
      if (!ctx) return false;

      if (this.fourier.active) {
        this.updateFourier(baseFreq, amplitudes);
        return true;
      }

      this.fourier.baseFreq = baseFreq;
      this.fourier.amplitudes = amplitudes.slice(0, 4);

      const now = ctx.currentTime;
      const busGain = ctx.createGain();
      busGain.gain.setValueAtTime(0.0001, now);
      busGain.gain.exponentialRampToValueAtTime(0.24, now + 0.04);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;

      busGain.connect(analyser);
      analyser.connect(this.masterGain);

      const oscs = [];
      const gains = [];
      const normFactor = this._fourierNorm(this.fourier.amplitudes);

      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * (i + 1), now);
        gain.gain.setValueAtTime(this.fourier.amplitudes[i] * normFactor, now);
        osc.connect(gain);
        gain.connect(busGain);
        osc.start(now);
        oscs.push(osc);
        gains.push(gain);
      }

      this.fourier.oscs = oscs;
      this.fourier.gains = gains;
      this.fourier.busGain = busGain;
      this.fourier.analyser = analyser;
      this.fourier.timeData = new Float32Array(analyser.fftSize);
      this.fourier.active = true;
      return true;
    }

    updateFourier(baseFreq, amplitudes) {
      this.fourier.baseFreq = baseFreq;
      this.fourier.amplitudes = amplitudes.slice(0, 4);

      if (!this.fourier.active || !this.ctx) return;

      const now = this.ctx.currentTime;
      const normFactor = this._fourierNorm(this.fourier.amplitudes);

      for (let i = 0; i < 4; i++) {
        if (this.fourier.oscs[i]) {
          this.fourier.oscs[i].frequency.setTargetAtTime(baseFreq * (i + 1), now, 0.015);
        }
        if (this.fourier.gains[i]) {
          this.fourier.gains[i].gain.setTargetAtTime(this.fourier.amplitudes[i] * normFactor, now, 0.015);
        }
      }
    }

    stopFourier() {
      if (!this.fourier.active || !this.ctx) return;
      const now = this.ctx.currentTime;
      const busGain = this.fourier.busGain;
      const oscs = this.fourier.oscs;

      if (busGain) {
        busGain.gain.cancelScheduledValues(now);
        busGain.gain.setValueAtTime(Math.max(0.0001, busGain.gain.value), now);
        busGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      }

      oscs.forEach((osc) => {
        try {
          osc.stop(now + 0.045);
        } catch (_) {
          // Oscilador já encerrado
        }
      });

      this.fourier.oscs = [];
      this.fourier.gains = [];
      this.fourier.busGain = null;
      this.fourier.analyser = null;
      this.fourier.active = false;
    }

    _fourierNorm(amps) {
      const sum = amps.reduce((acc, a) => acc + Math.abs(a), 0);
      return sum > 1 ? 1 / sum : 1;
    }

    getFourierInstantaneousLevel() {
      if (!this.fourier.active || !this.fourier.analyser || !this.fourier.timeData) return 0;
      this.fourier.analyser.getFloatTimeDomainData(this.fourier.timeData);
      return this.fourier.timeData[0] || 0;
    }

    /* ======================================================================
       MÓDULO 2: DEGRADAÇÃO PCM AUDÍVEL (DOWNSAMPLER + QUANTIZAÇÃO v-BIT)
       ====================================================================== */
    startPcmAudio(signalFreq, sampleRate, bitDepth) {
      const ctx = this.ensureContext();
      if (!ctx) return false;

      this.pcm.signalFreq = signalFreq;
      this.pcm.sampleRate = sampleRate;
      this.pcm.bitDepth = bitDepth;
      this.pcm.active = true;

      this._swapPcmBufferSource();
      return true;
    }

    updatePcmAudio(signalFreq, sampleRate, bitDepth) {
      this.pcm.signalFreq = signalFreq;
      this.pcm.sampleRate = sampleRate;
      this.pcm.bitDepth = bitDepth;

      if (this.pcm.active && this.ctx) {
        this._swapPcmBufferSource();
      }
    }

    stopPcmAudio() {
      if (!this.pcm.active || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.pcm.busGain) {
        this.pcm.busGain.gain.cancelScheduledValues(now);
        this.pcm.busGain.gain.setValueAtTime(Math.max(0.0001, this.pcm.busGain.gain.value), now);
        this.pcm.busGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      }
      if (this.pcm.sourceNode) {
        const src = this.pcm.sourceNode;
        try {
          src.stop(now + 0.04);
        } catch (_) {
          // Fonte já encerrada
        }
      }
      this.pcm.sourceNode = null;
      this.pcm.busGain = null;
      this.pcm.active = false;
    }

    /**
     * Gera um buffer de loop perfeito aplicando amostragem Zero-Order Hold (Fa)
     * e quantização uniforme em q = 2^v níveis sobre a senoide de frequência Fmax.
     * Produz aliasing real audível quando Fa < 2 * Fmax e ruído de quantização real em v baixo.
     */
    _swapPcmBufferSource() {
      const ctx = this.ctx;
      if (!ctx) return;

      const outSr = ctx.sampleRate;
      const durationSec = 1.5;
      const totalSamples = Math.floor(outSr * durationSec);
      const buffer = ctx.createBuffer(1, totalSamples, outSr);
      const data = buffer.getChannelData(0);

      const fMax = this.pcm.signalFreq;
      const fSample = Math.max(500, this.pcm.sampleRate);
      const bits = Math.max(2, Math.min(8, this.pcm.bitDepth));
      const levels = Math.pow(2, bits);
      const maxLevel = levels - 1;

      const stepSize = outSr / fSample;
      let nextHoldIdx = 0;
      let heldQuantized = 0;

      // Leve modulação de amplitude (tremolo sutil de 1.5 Hz) para evidenciar o piso de ruído de quantização
      for (let i = 0; i < totalSamples; i++) {
        if (i >= nextHoldIdx) {
          const t = i / outSr;
          const env = 0.72 + 0.25 * Math.sin(2 * Math.PI * 1.3333 * t);
          const raw = Math.sin(2 * Math.PI * fMax * t) * env; // [-1, 1]
          const normalized = (raw + 1) * 0.5; // [0, 1]
          const qIndex = Math.max(0, Math.min(maxLevel, Math.round(normalized * maxLevel)));
          heldQuantized = (qIndex / maxLevel) * 2 - 1; // [-1, 1]
          nextHoldIdx += stepSize;
        }
        data[i] = heldQuantized;
      }

      const now = ctx.currentTime;
      const prevSource = this.pcm.sourceNode;
      const prevGain = this.pcm.busGain;

      const newGain = ctx.createGain();
      newGain.gain.setValueAtTime(0.0001, now);
      newGain.gain.exponentialRampToValueAtTime(0.22, now + 0.025);
      newGain.connect(this.masterGain);

      const newSource = ctx.createBufferSource();
      newSource.buffer = buffer;
      newSource.loop = true;
      newSource.connect(newGain);
      newSource.start(now);

      if (prevGain) {
        prevGain.gain.cancelScheduledValues(now);
        prevGain.gain.setValueAtTime(Math.max(0.0001, prevGain.gain.value), now);
        prevGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      }
      if (prevSource) {
        try {
          prevSource.stop(now + 0.035);
        } catch (_) {
          // Ignora
        }
      }

      this.pcm.sourceNode = newSource;
      this.pcm.busGain = newGain;
    }

    /* ======================================================================
       MÓDULO 4A: EQUALIZADOR GRÁFICO 5 BANDAS (BIQUADFILTERNODE) + FFT REAL
       ====================================================================== */
    _initEqGraph() {
      const ctx = this.ctx;
      const inputGain = ctx.createGain();
      inputGain.gain.value = 0.9;

      let prevNode = inputGain;
      this.eq.filters = {};

      EQ_BAND_CONFIGS.forEach((cfg) => {
        const filter = ctx.createBiquadFilter();
        filter.type = cfg.type;
        filter.frequency.value = cfg.freq;
        filter.Q.value = cfg.q;
        filter.gain.value = this.eq.gainsDb[cfg.key] || 0;
        prevNode.connect(filter);
        prevNode = filter;
        this.eq.filters[cfg.key] = filter;
      });

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.78;
      analyser.minDecibels = -84;
      analyser.maxDecibels = -6;

      prevNode.connect(analyser);
      analyser.connect(this.masterGain);

      this.eq.inputGain = inputGain;
      this.eq.analyser = analyser;
      this.eq.freqData = new Float32Array(analyser.frequencyBinCount);
    }

    setEqBandGain(bandKey, gainDb) {
      const clamped = Math.max(-18, Math.min(18, Number(gainDb) || 0));
      this.eq.gainsDb[bandKey] = clamped;
      if (this.ctx && this.eq.filters[bandKey]) {
        this.eq.filters[bandKey].gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
      }
    }

    setAllEqGains(gainsMap) {
      Object.keys(gainsMap).forEach((key) => {
        this.setEqBandGain(key, gainsMap[key]);
      });
    }

    /**
     * Calcula a resposta em magnitude (dB) combinada das 5 bandas do EQ para um vetor de frequências.
     * Usa getFrequencyResponse() nativo dos BiquadFilterNode quando o AudioContext está ativo,
     * ou a função de transferência analítica exata (Audio EQ Cookbook) antes do desbloqueio.
     */
    getEqFrequencyResponseDb(freqArray) {
      const len = freqArray.length;
      const totalDb = new Float32Array(len);

      if (this.ctx && Object.keys(this.eq.filters).length === 5) {
        const mag = new Float32Array(len);
        const phase = new Float32Array(len);
        EQ_BAND_CONFIGS.forEach((cfg) => {
          const filter = this.eq.filters[cfg.key];
          if (!filter) return;
          filter.getFrequencyResponse(freqArray, mag, phase);
          for (let i = 0; i < len; i++) {
            const m = Math.max(1e-6, mag[i]);
            totalDb[i] += 20 * Math.log10(m);
          }
        });
        return totalDb;
      }

      // Cálculo analítico fiel quando o AudioContext ainda não foi inicializado
      const fs = 44100;
      EQ_BAND_CONFIGS.forEach((cfg) => {
        const gainDb = this.eq.gainsDb[cfg.key] || 0;
        if (Math.abs(gainDb) < 0.01) return;

        const A = Math.pow(10, gainDb / 40);
        const w0 = (2 * Math.PI * cfg.freq) / fs;
        const cosW0 = Math.cos(w0);
        const sinW0 = Math.sin(w0);
        const alpha = sinW0 / (2 * cfg.q);

        let b0, b1, b2, a0, a1, a2;
        if (cfg.type === 'lowshelf') {
          const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) - (A - 1) * cosW0 + twoSqrtAAlpha);
          b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
          b2 = A * ((A + 1) - (A - 1) * cosW0 - twoSqrtAAlpha);
          a0 = (A + 1) + (A - 1) * cosW0 + twoSqrtAAlpha;
          a1 = -2 * ((A - 1) + (A + 1) * cosW0);
          a2 = (A + 1) + (A - 1) * cosW0 - twoSqrtAAlpha;
        } else if (cfg.type === 'highshelf') {
          const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
          b0 = A * ((A + 1) + (A - 1) * cosW0 + twoSqrtAAlpha);
          b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
          b2 = A * ((A + 1) + (A - 1) * cosW0 - twoSqrtAAlpha);
          a0 = (A + 1) - (A - 1) * cosW0 + twoSqrtAAlpha;
          a1 = 2 * ((A - 1) - (A + 1) * cosW0);
          a2 = (A + 1) - (A - 1) * cosW0 - twoSqrtAAlpha;
        } else {
          b0 = 1 + alpha * A;
          b1 = -2 * cosW0;
          b2 = 1 - alpha * A;
          a0 = 1 + alpha / A;
          a1 = -2 * cosW0;
          a2 = 1 - alpha / A;
        }

        b0 /= a0; b1 /= a0; b2 /= a0;
        a1 /= a0; a2 /= a0;

        for (let i = 0; i < len; i++) {
          const w = (2 * Math.PI * freqArray[i]) / fs;
          const phi = Math.sin(w / 2);
          const phi2 = phi * phi;
          const num = Math.pow(b0 + b1 + b2, 2) - 4 * (b0 * b1 + 4 * b0 * b2 + b1 * b2) * phi2 + 16 * b0 * b2 * phi2 * phi2;
          const den = Math.pow(1 + a1 + a2, 2) - 4 * (a1 + 4 * a2 + a1 * a2) * phi2 + 16 * a2 * phi2 * phi2;
          const magSq = Math.max(1e-12, num / Math.max(1e-12, den));
          totalDb[i] += 10 * Math.log10(magSq);
        }
      });

      return totalDb;
    }

    /**
     * Reproduz exclusivamente o arquivo de áudio real gravado pela equipe (TODO_MIDIAS.md)
     * passando pela cadeia real dos 5 BiquadFilterNode e pelo AnalyserNode FFT.
     */
    async startEqAudio(url, mediaElement) {
      const ctx = this.ensureContext();
      if (!ctx) return { ok: false, reason: 'Web Audio indisponível' };

      this.stopEqAudio();
      this.eq.currentUrl = url;

      // Estratégia 1: fetch + decodeAudioData (ideal via servidor HTTP local, zero tainting CORS)
      try {
        let audioBuffer = this.eq.bufferCache.get(url);
        if (!audioBuffer) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          audioBuffer = await ctx.decodeAudioData(arrayBuf);
          this.eq.bufferCache.set(url, audioBuffer);
        }

        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.loop = true;
        src.connect(this.eq.inputGain);
        src.start(ctx.currentTime);

        this.eq.bufferSource = src;
        this.eq.sourceType = 'buffer';
        this.eq.active = true;
        return { ok: true, duration: audioBuffer.duration };
      } catch (_) {
        // Fallback silencioso para <audio> (útil se aberto localmente via file://)
      }

      // Estratégia 2: elemento <audio> nativo conectado via MediaElementAudioSourceNode
      if (mediaElement) {
        try {
          if (mediaElement.getAttribute('src') !== url) {
            mediaElement.src = url;
          }
          if (!this.eq.mediaSourceNode) {
            this.eq.mediaSourceNode = ctx.createMediaElementSource(mediaElement);
            this.eq.mediaSourceNode.connect(this.eq.inputGain);
            this.eq.mediaElement = mediaElement;
          }
          mediaElement.currentTime = 0;
          await mediaElement.play();
          this.eq.sourceType = 'media';
          this.eq.active = true;
          return { ok: true, duration: mediaElement.duration || 0 };
        } catch (_) {
          this.eq.active = false;
          return {
            ok: false,
            reason: 'Gravação não encontrada. Adicione o arquivo .wav em assets/audio/ (ver TODO_MIDIAS.md).'
          };
        }
      }

      return { ok: false, reason: 'Arquivo de áudio indisponível.' };
    }

    stopEqAudio() {
      if (this.eq.sourceType === 'buffer' && this.eq.bufferSource) {
        try {
          this.eq.bufferSource.stop();
          this.eq.bufferSource.disconnect();
        } catch (_) {
          // Ignora
        }
        this.eq.bufferSource = null;
      }
      if (this.eq.sourceType === 'media' && this.eq.mediaElement) {
        try {
          this.eq.mediaElement.pause();
          this.eq.mediaElement.currentTime = 0;
        } catch (_) {
          // Ignora
        }
      }
      this.eq.active = false;
      this.eq.sourceType = null;
    }

    getEqFftSnapshot() {
      if (!this.eq.active || !this.eq.analyser || !this.eq.freqData || !this.ctx) {
        return null;
      }
      this.eq.analyser.getFloatFrequencyData(this.eq.freqData);

      const sampleRate = this.ctx.sampleRate;
      const binCount = this.eq.freqData.length;
      const binWidth = sampleRate / this.eq.analyser.fftSize;

      let peakIndex = 1;
      let peakDb = -Infinity;
      const minBin = Math.max(1, Math.floor(60 / binWidth));
      const maxBin = Math.min(binCount - 1, Math.ceil(16000 / binWidth));

      for (let i = minBin; i <= maxBin; i++) {
        if (this.eq.freqData[i] > peakDb) {
          peakDb = this.eq.freqData[i];
          peakIndex = i;
        }
      }

      return {
        data: this.eq.freqData,
        sampleRate,
        fftSize: this.eq.analyser.fftSize,
        peakFreq: peakIndex * binWidth,
        peakDb: Number.isFinite(peakDb) ? peakDb : -84
      };
    }

    /* ======================================================================
       MÓDULO 4B: SÍNTESE MIDI — MOTOR FM VS. MOTOR PCM (SAMPLER WAVETABLE)
       ====================================================================== */
    _initMidiBus() {
      const ctx = this.ctx;
      const bus = ctx.createGain();
      bus.gain.value = 0.72;
      bus.connect(this.masterGain);
      this.midi.busGain = bus;

      // Constrói uma amostra PCM acústica de referência (C4) em memória de amostras (estilo Sampler)
      this.midi.pcmReferenceBuffer = this._createPcmSampleBuffer(ctx, this.midi.pcmReferenceFreq);
    }

    _createPcmSampleBuffer(ctx, baseFreq) {
      const sr = ctx.sampleRate;
      const duration = 1.6;
      const len = Math.floor(sr * duration);
      const buf = ctx.createBuffer(1, len, sr);
      const ch = buf.getChannelData(0);

      // Perfil espectral semelhante a um piano acústico amostrado (harmônicos decaindo em taxas distintas + transiente de martelo)
      const partials = [
        { ratio: 1.0,  amp: 1.00, decay: 2.2 },
        { ratio: 2.0,  amp: 0.52, decay: 3.1 },
        { ratio: 3.0,  amp: 0.28, decay: 4.5 },
        { ratio: 4.0,  amp: 0.16, decay: 6.0 },
        { ratio: 5.01, amp: 0.09, decay: 7.8 },
        { ratio: 6.02, amp: 0.05, decay: 9.5 }
      ];

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const attack = Math.min(1, t / 0.0045);
        let sample = 0;

        for (let p = 0; p < partials.length; p++) {
          const part = partials[p];
          sample += part.amp * Math.exp(-part.decay * t) * Math.sin(2 * Math.PI * baseFreq * part.ratio * t);
        }

        // Leve impacto acústico inicial (primeiros 14 ms)
        if (t < 0.014) {
          const hitEnv = (1 - t / 0.014);
          sample += 0.14 * hitEnv * hitEnv * Math.sin(2 * Math.PI * baseFreq * 7.3 * t);
        }

        ch[i] = sample * attack * 0.48;
      }

      return buf;
    }

    playMidiNote(noteOrFreq, engineMode = 'fm', velocity = 100, startTime = null, durationSec = 0.28) {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const freq = typeof noteOrFreq === 'number'
        ? noteOrFreq
        : (NOTE_FREQUENCIES[noteOrFreq] || 261.6256);
      const t0 = startTime !== null ? Math.max(ctx.currentTime, startTime) : ctx.currentTime;
      const velNorm = Math.max(0.15, Math.min(1, velocity / 127));

      if (engineMode === 'pcm') {
        this._triggerPcmSamplerNote(freq, velNorm, t0, durationSec);
      } else {
        this._triggerFmNote(freq, velNorm, t0, durationSec);
      }
    }

    /**
     * Síntese FM (2 operadores): modulador (2x f0) modulando a frequência da portadora (f0)
     * com índice de modulação decaindo rapidamente (timbre eletrônico/metálico característico de FM).
     */
    _triggerFmNote(freq, velNorm, t0, dur) {
      const ctx = this.ctx;
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const ampGain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, t0);

      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 2.0, t0);

      const peakModIndex = freq * 2.8 * velNorm;
      modGain.gain.setValueAtTime(peakModIndex, t0);
      modGain.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.18), t0 + dur * 0.85);

      ampGain.gain.setValueAtTime(0.0001, t0);
      ampGain.gain.linearRampToValueAtTime(0.28 * velNorm, t0 + 0.008);
      ampGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.14);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(ampGain);
      ampGain.connect(this.midi.busGain);

      carrier.start(t0);
      modulator.start(t0);
      carrier.stop(t0 + dur + 0.18);
      modulator.stop(t0 + dur + 0.18);
    }

    /**
     * Síntese PCM (Sampler): dispara a forma de onda gravada em memória de amostras
     * transposta por taxa de reprodução (playbackRate) e moldada por filtro passa-baixas acústico.
     */
    _triggerPcmSamplerNote(freq, velNorm, t0, dur) {
      const ctx = this.ctx;
      if (!this.midi.pcmReferenceBuffer) return;

      const src = ctx.createBufferSource();
      src.buffer = this.midi.pcmReferenceBuffer;
      src.playbackRate.setValueAtTime(freq / this.midi.pcmReferenceFreq, t0);

      const warmthFilter = ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.setValueAtTime(1400 + velNorm * 4200, t0);
      warmthFilter.Q.value = 0.7;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(0.55 * velNorm, t0 + 0.006);
      env.gain.setValueAtTime(0.45 * velNorm, t0 + dur * 0.7);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.24);

      src.connect(warmthFilter);
      warmthFilter.connect(env);
      env.connect(this.midi.busGain);

      src.start(t0);
      src.stop(t0 + dur + 0.28);
    }
  }

  StudioAudioEngine.NOTE_FREQUENCIES = NOTE_FREQUENCIES;
  StudioAudioEngine.EQ_BAND_CONFIGS = EQ_BAND_CONFIGS;

  global.StudioAudioEngine = StudioAudioEngine;
})(window);
