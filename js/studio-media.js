/**
 * STUDIO AUDIO WORKBENCH — Controladores de Mídia (js/studio-media.js)
 *
 * Recursos:
 * - Comparador A/B sincronizado em tempo real (Áudio Bruto vs. Áudio Tratado) no Estúdio de Tratamento
 *   com forma de onda estática/fixa da faixa completa e cursor de reprodução sincronizado.
 * - Leitor binário nativo de Standard MIDI File (.mid) reproduzido via StudioAudioEngine na aba Síntese, MIDI & Voz
 *   (compatível tanto com servidor HTTP quanto com execução direta via file://).
 */

(function (global) {
  'use strict';

  // Envelopes reais pré-extraídos de voz_bruta_original.wav e voz_tratada_master.wav (180 colunas)
  // garantem desenho fixo e fiel desde o primeiro frame, inclusive sob protocolo file://.
  const AB_STATIC_PEAKS = {
    raw: [
      0.026,0.045,0.076,0.101,0.079,0.08,0.084,0.091,0.099,0.088,0.106,0.073,0.069,0.068,0.078,0.11,0.095,0.098,0.105,0.11,
      0.108,0.108,0.484,0.427,0.491,0.369,0.262,0.244,0.257,0.308,0.493,0.459,0.168,0.175,0.292,0.318,0.316,0.383,0.399,0.238,
      0.301,0.6,0.517,0.56,0.607,0.596,0.608,0.563,0.441,0.377,0.217,0.355,0.269,0.149,0.152,0.305,0.242,0.121,0.204,0.164,
      0.161,0.323,0.375,0.318,0.32,0.293,0.335,0.32,0.412,0.443,0.627,0.592,0.417,0.465,0.324,0.213,0.252,0.313,0.113,0.143,
      0.327,0.411,0.256,0.406,0.81,0.777,0.514,0.214,0.154,0.435,0.408,0.319,0.409,0.395,0.317,0.199,0.217,0.202,0.204,0.208,
      0.163,0.403,0.378,0.419,0.463,0.415,0.292,0.183,0.175,0.244,0.118,0.219,0.263,0.302,0.244,0.351,0.319,0.494,0.486,0.35,
      0.319,0.344,0.283,0.249,0.325,0.655,0.637,0.722,0.643,0.664,0.169,0.135,0.445,0.567,0.592,0.415,0.355,0.31,0.377,0.108,
      0.093,0.32,0.314,0.153,0.18,0.232,0.601,0.541,0.407,0.281,0.297,0.238,0.3,0.37,0.421,0.387,0.432,0.439,0.323,0.35,
      0.377,0.342,0.262,0.164,0.129,0.197,0.198,0.382,0.288,0.268,0.29,0.186,0.296,0.215,0.249,0.243,0.172,0.117,0.135,0.098
    ],
    treated: [
      0.006,0.011,0.015,0.022,0.02,0.018,0.02,0.016,0.02,0.016,0.016,0.016,0.017,0.014,0.016,0.023,0.021,0.018,0.022,0.025,
      0.024,0.04,0.197,0.166,0.157,0.146,0.09,0.201,0.18,0.174,0.302,0.202,0.069,0.067,0.172,0.145,0.36,0.61,0.658,0.314,
      0.138,0.341,0.327,0.304,0.287,0.256,0.25,0.199,0.141,0.098,0.139,0.379,0.335,0.099,0.042,0.114,0.116,0.054,0.235,0.109,
      0.099,0.222,0.238,0.149,0.143,0.115,0.113,0.154,0.299,0.293,0.414,0.402,0.194,0.216,0.151,0.068,0.134,0.149,0.028,0.037,
      0.155,0.178,0.097,0.126,0.375,0.396,0.287,0.145,0.097,0.156,0.147,0.083,0.173,0.164,0.12,0.233,0.187,0.163,0.206,0.193,
      0.116,0.167,0.132,0.151,0.168,0.157,0.099,0.051,0.06,0.076,0.038,0.212,0.103,0.091,0.256,0.458,0.456,0.298,0.303,0.226,
      0.182,0.164,0.206,0.131,0.191,0.356,0.548,0.529,0.512,0.489,0.086,0.068,0.175,0.32,0.288,0.194,0.14,0.095,0.138,0.034,
      0.029,0.167,0.15,0.101,0.1,0.081,0.263,0.244,0.208,0.198,0.327,0.228,0.114,0.158,0.195,0.263,0.293,0.262,0.183,0.213,
      0.197,0.181,0.121,0.05,0.117,0.21,0.068,0.54,0.313,0.285,0.309,0.227,0.164,0.152,0.131,0.09,0.062,0.036,0.025,0.029
    ]
  };

  // Fallback binário integrado de assets/midi/composicao_autoral.mid para funcionamento 100% offline via file://
  const EMBEDDED_MIDI_B64 =
    'TVRoZAAAAAYAAQAEAeBNVHJrAAAAHQD/UQMIUq4A/1gEBAIYCAD/AwZNdXNpY2EA/y8ATVRyawAABJAAwFAAkEBggVyAQAAUkENggVyAQwAUkDxggVyAPAAUkENggVyAQwAUkEBggVyAQAAUkENggVyAQwAUkEBggVyAQAAUkD5ggVyAPgAUkD5ggVyAPgAUkENggVyAQwAUkEdggVyARwAUkENggVyAQwAUkD5ggVyAPgAUkENggVyAQwAUkEdggVyARwAUkEVggVyARQAUkDxggVyAPAAUkEBggVyAQAAUkEVggVyARQAUkEBggVyAQAAUkDxggVyAPAAUkEBggVyAQAAUkDxggVyAPAAUkEdggVyARwAUkDxggVyAPAAUkEFggVyAQQAUkEVggVyARQAUkEFggVyAQQAUkDxggVyAPAAUkEFggVyAQQAUkEVggVyARQAUkENggVyAQwAUkEBggVyAQAAUkENggVyAQwAUkDxggVyAPAAUkENggVyAQwAUkEBggVyAQAAUkENggVyAQwAUkEBggVyAQAAUkD5ggVyAPgAUkD5ggVyAPgAUkENggVyAQwAUkEdggVyARwAUkENggVyAQwAUkD5ggVyAPgAUkENggVyAQwAUkEdggVyARwAUkEVggVyARQAUkDxggVyAPAAUkEBggVyAQAAUkEVggVyARQAUkEBggVyAQAAUkDxggVyAPAAUkEBggVyAQAAUkDxggVyAPAAUkEdggVyARwAUkDxggVyAPAAUkEFggVyAQQAUkEVggVyARQAUkEFggVyAQQAUkDxggVyAPAAUkEFggVyAQQAUkEVggVyARQAUkENggVyAQwAUkExggVyATAAUkE9ggVyATwAUkEhggVyASAAUkE9ggVyATwAUkExggVyATAAUkE9ggVyATwAUkExggVyATAAUkEpggVyASgAUkEpggVyASgAUkE9ggVyATwAUkFNggVyAUwAUkE9ggVyATwAUkEpggVyASgAUkE9ggVyATwAUkFNggVyAUwAUkFFggVyAUQAUkEhggVyASAAUkExggVyATAAUkFFggVyAUQAUkExggVyATAAUkEhggVyASAAUkExggVyATAAUkEhggVyASAAUkFNggVyAUwAUkEhggVyASAAUkE1ggVyATQAUkFFggVyAUQAUkE1ggVyATQAUkEhggVyASAAUkE1ggVyATQAUkFFggVyAUQAUkE9ggVyATwAUkExggVyATAAUkE9ggVyATwAUkEhggVyASAAUkE9ggVyATwAUkExggVyATAAUkE9ggVyATwAUkExggVyATAAUkEpggVyASgAUkEpggVyASgAUkE9ggVyATwAUkFNggVyAUwAUkE9ggVyATwAUkEpggVyASgAUkE9ggVyATwAUkFNggVyAUwAUkFFggVyAUQAUkEhggVyASAAUkExggVyATAAUkFFggVyAUQAUkExggVyATAAUkEhggVyASAAUkExggVyATAAUkEhggVyASAAUkFNggVyAUwAUkEhggVyASAAUkE1ggVyATQAUkFFggVyAUQAUkE1ggVyATQAUkEhggVyASAAUkE1ggVyATQAUkFFggVyAUQAUkE9ggVyATwAUkEhgjwCASAAA/y8ATVRyawAAAlAAwSEAkSRag0KBJAAekStag0KBKwAekSRag0KBJAAekStag0KBKwAekStag0KBKwAekTJag0KBMgAekStag0KBKwAekTJag0KBMgAekS1ag0KBLQAekTRag0KBNAAekS1ag0KBLQAekTRag0KBNAAekSlag0KBKQAekTBag0KBMAAekSlag0KBKQAekTBag0KBMAAekSRag0KBJAAekStag0KBKwAekSRag0KBJAAekStag0KBKwAekStag0KBKwAekTJag0KBMgAekStag0KBKwAekTJag0KBMgAekS1ag0KBLQAekTRag0KBNAAekS1ag0KBLQAekTRag0KBNAAekSlag0KBKQAekTBag0KBMAAekSlag0KBKQAekTBag0KBMAAekSRag0KBJAAekStag0KBKwAekSRag0KBJAAekStag0KBKwAekStag0KBKwAekTJag0KBMgAekStag0KBKwAekTJag0KBMgAekS1ag0KBLQAekTRag0KBNAAekS1ag0KBLQAekTRag0KBNAAekSlag0KBKQAekTBag0KBMAAekSlag0KBKQAekTBag0KBMAAekSRag0KBJAAekStag0KBKwAekSRag0KBJAAekStag0KBKwAekStag0KBKwAekTJag0KBMgAekStag0KBKwAekTJag0KBMgAekS1ag0KBLQAekTRag0KBNAAekS1ag0KBLQAekTRag0KBNAAekSlag0KBKQAekTBag0KBMAAekSlag0KBKQAekTBag0KBMAAekSRajwCBJAAA/y8ATVRyawAAAbAAwlkAkjA8AJI0PACSNzyObIIwAACCNAAAgjcAFJIrPACSLzwAkjI8jmyCKwAAgi8AAIIyABSSLTwAkjA8AJI0PI5sgi0AAIIwAACCNAAUkik8AJItPACSMDyObIIpAACCLQAAgjAAFJIwPACSNDwAkjc8jmyCMAAAgjQAAII3ABSSKzwAki88AJIyPI5sgisAAIIvAACCMgAUki08AJIwPACSNDyObIItAACCMAAAgjQAFJIpPACSLTwAkjA8jmyCKQAAgi0AAIIwABSSMDwAkjQ8AJI3PI5sgjAAAII0AACCNwAUkis8AJIvPACSMjyObIIrAACCLwAAgjIAFJItPACSMDwAkjQ8jmyCLQAAgjAAAII0ABSSKTwAki08AJIwPI5sgikAAIItAACCMAAUkjA8AJI0PACSNzyObIIwAACCNAAAgjcAFJIrPACSLzwAkjI8jmyCKwAAgi8AAIIyABSSLTwAkjA8AJI0PI5sgi0AAIIwAACCNAAUkik8AJItPACSMDyObIIpAACCLQAAgjAAFJIwPACSNDwAkjc8jwCCMAAAgjQAAII3AAD/LwA=';

  function base64ToArrayBuffer(b64) {
    const binStr = window.atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function setupCanvasHiDpi(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const w = rect.width;
    const h = rect.height;
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function formatClock(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ========================================================================
     1. COMPARADOR A/B DE ÁUDIO DIGITALIZADO (BRUTO VS. TRATADO)
     ======================================================================== */
  function initAudioABComparator() {
    const rawAudio = document.getElementById('audioRawSource');
    const treatedAudio = document.getElementById('audioTreatedSource');
    const selectRawBtn = document.getElementById('abSelectRaw');
    const selectTreatedBtn = document.getElementById('abSelectTreated');
    const playBtn = document.getElementById('abPlayBtn');
    const stopBtn = document.getElementById('abStopBtn');
    const timeDisplay = document.getElementById('abTimeDisplay');
    const fileStatus = document.getElementById('abFileStatus');
    const audioLed = document.getElementById('abAudioLed');
    const canvas = document.getElementById('abWaveformCanvas');

    if (!rawAudio || !treatedAudio || !canvas) {
      return { stop: () => {}, redraw: () => {} };
    }

    let mode = 'raw'; // 'raw' | 'treated'
    let isPlaying = false;
    let rafId = null;

    // Armazena envelopes estáticos imutáveis extraídos diretamente dos bytes RIFF/WAV (sem AudioBuffer.getChannelData,
    // evitando mutação cumulativa por proteções anti-fingerprinting de navegadores como Brave/extensões).
    const peakStore = { raw: null, treated: null };

    function extractWavPeaksFromArrayBuffer(arrayBuffer, numBins = 720) {
      const view = new DataView(arrayBuffer);
      if (view.byteLength < 44) return null;
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (riff !== 'RIFF') return null;

      let pos = 12;
      let audioFormat = 1;
      let channels = 1;
      let sampleRate = 48000;
      let bitsPerSample = 16;
      let dataStart = 0;
      let dataLen = 0;

      while (pos + 8 <= view.byteLength) {
        const id = String.fromCharCode(
          view.getUint8(pos),
          view.getUint8(pos + 1),
          view.getUint8(pos + 2),
          view.getUint8(pos + 3)
        );
        const chunkSize = view.getUint32(pos + 4, true);
        if (id === 'fmt ' && pos + 24 <= view.byteLength) {
          audioFormat = view.getUint16(pos + 8, true);
          channels = Math.max(1, view.getUint16(pos + 10, true));
          sampleRate = Math.max(1, view.getUint32(pos + 12, true));
          bitsPerSample = view.getUint16(pos + 22, true);
        } else if (id === 'data') {
          dataStart = pos + 8;
          dataLen = Math.min(chunkSize, view.byteLength - dataStart);
          break;
        }
        pos += 8 + chunkSize + (chunkSize % 2);
      }

      if (!dataStart || dataLen <= 0) return null;
      const bytesPerSample = Math.max(1, Math.floor(bitsPerSample / 8));
      const blockAlign = bytesPerSample * channels;
      const totalFrames = Math.floor(dataLen / blockAlign);
      if (totalFrames <= 0) return null;

      const mins = new Float32Array(numBins);
      const maxs = new Float32Array(numBins);
      const framesPerBin = Math.max(1, Math.floor(totalFrames / numBins));

      for (let b = 0; b < numBins; b++) {
        const startFrame = b * framesPerBin;
        const endFrame = b === numBins - 1 ? totalFrames : Math.min(totalFrames, startFrame + framesPerBin);
        let minVal = 1.0;
        let maxVal = -1.0;

        for (let f = startFrame; f < endFrame; f++) {
          const off = dataStart + f * blockAlign;
          if (off + bytesPerSample > view.byteLength) break;
          let sample = 0;
          if (audioFormat === 1 && bitsPerSample === 16) {
            sample = view.getInt16(off, true) / 32768;
          } else if (audioFormat === 1 && bitsPerSample === 24) {
            const b0 = view.getUint8(off);
            const b1 = view.getUint8(off + 1);
            const b2 = view.getUint8(off + 2);
            const int24 = ((b0 | (b1 << 8) | (b2 << 16)) << 8) >> 8;
            sample = int24 / 8388608;
          } else if (audioFormat === 3 && bitsPerSample === 32) {
            sample = view.getFloat32(off, true);
          } else if (audioFormat === 1 && bitsPerSample === 8) {
            sample = (view.getUint8(off) - 128) / 128;
          }
          if (sample < minVal) minVal = sample;
          if (sample > maxVal) maxVal = sample;
        }

        if (minVal > maxVal) {
          minVal = 0;
          maxVal = 0;
        }
        mins[b] = minVal;
        maxs[b] = maxVal;
      }

      return Object.freeze({
        mins,
        maxs,
        numBins,
        duration: totalFrames / sampleRate
      });
    }

    function tryLoadStaticPeaks(key, url) {
      if (!url || peakStore[key]) return;
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((ab) => {
          const extracted = extractWavPeaksFromArrayBuffer(ab, 720);
          if (extracted) {
            peakStore[key] = extracted;
            drawWaveform();
          }
        })
        .catch(() => {
          // Mantém o envelope estático fiel (AB_STATIC_PEAKS) sem erro no console
        });
    }

    function syncReadyStatus() {
      const dur = Number.isFinite(rawAudio.duration) && rawAudio.duration > 0
        ? rawAudio.duration
        : (Number.isFinite(treatedAudio.duration) ? treatedAudio.duration : 0);
      if (!isPlaying && fileStatus && dur > 0) {
        fileStatus.textContent = `Faixas A/B prontas (${dur.toFixed(1)} s)`;
      }
      updateTimeReadout();
    }

    rawAudio.addEventListener('loadedmetadata', () => {
      syncReadyStatus();
      tryLoadStaticPeaks('raw', rawAudio.getAttribute('src'));
    });

    treatedAudio.addEventListener('loadedmetadata', () => {
      syncReadyStatus();
      tryLoadStaticPeaks('treated', treatedAudio.getAttribute('src'));
    });

    [rawAudio, treatedAudio].forEach((audioEl) => {
      audioEl.addEventListener('error', () => {
        if (fileStatus) fileStatus.textContent = 'Arquivo de áudio indisponível';
      });
    });

    if (rawAudio.readyState >= 1 || treatedAudio.readyState >= 1) {
      syncReadyStatus();
    }
    tryLoadStaticPeaks('raw', rawAudio.getAttribute('src'));
    tryLoadStaticPeaks('treated', treatedAudio.getAttribute('src'));

    function getActiveAudio() {
      return mode === 'treated' ? treatedAudio : rawAudio;
    }

    function updateTimeReadout() {
      const active = getActiveAudio();
      const cur = active.currentTime || 0;
      const dur = Number.isFinite(active.duration) && active.duration > 0 ? active.duration : 6.27;
      if (timeDisplay) timeDisplay.textContent = `${formatClock(cur)} / ${formatClock(dur)}`;
    }

    /**
     * Desenha a forma de onda SEMPRE FIXA (padrão DAW) — nunca encolhe ou deforma durante a reprodução.
     * Apenas o cursor vertical (playhead) avança conforme o tempo da faixa.
     */
    function drawWaveform() {
      const setup = setupCanvasHiDpi(canvas);
      if (!setup) return;
      const { ctx, w, h } = setup;
      const midY = h / 2;

      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, w, h);

      // Grade vertical discreta
      ctx.strokeStyle = '#18181C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        const x = Math.round((w / 10) * i) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      // Eixo central (0 dB / repouso)
      ctx.strokeStyle = '#27272A';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(midY) + 0.5);
      ctx.lineTo(w, Math.round(midY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const activeColor = mode === 'treated' ? '#FF5500' : '#38BDF8';
      const activeAudio = getActiveAudio();
      const extracted = peakStore[mode];
      const totalDur = extracted
        ? extracted.duration
        : (Number.isFinite(activeAudio.duration) && activeAudio.duration > 0 ? activeAudio.duration : 6.27);
      const progressRatio = totalDur > 0 ? Math.min(1, Math.max(0, (activeAudio.currentTime || 0) / totalDur)) : 0;
      const playheadX = progressRatio * w;

      // Sombra sutil da região já reproduzida
      if (progressRatio > 0.001) {
        ctx.fillStyle = mode === 'treated' ? 'rgba(255, 85, 0, 0.07)' : 'rgba(56, 189, 248, 0.07)';
        ctx.fillRect(0, 0, playheadX, h);
      }

      if (extracted) {
        const { mins, maxs, numBins } = extracted;
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const binIdx = Math.min(numBins - 1, Math.floor((x / w) * numBins));
          const min = mins[binIdx];
          const max = maxs[binIdx];
          ctx.moveTo(x + 0.5, midY + min * (h * 0.44));
          ctx.lineTo(x + 0.5, midY + max * (h * 0.44));
        }
        ctx.stroke();
      } else {
        // Envelope estático real de 180 barras fixas (idêntico antes, durante e após o Play)
        const peaks = AB_STATIC_PEAKS[mode] || AB_STATIC_PEAKS.raw;
        const barStep = 3;
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 1; x < w; x += barStep) {
          const pos = (x / w) * (peaks.length - 1);
          const idx0 = Math.floor(pos);
          const idx1 = Math.min(peaks.length - 1, idx0 + 1);
          const frac = pos - idx0;
          const amp = peaks[idx0] * (1 - frac) + peaks[idx1] * frac;
          const halfBar = Math.max(1.2, amp * (h * 0.44));
          ctx.moveTo(x + 0.5, midY - halfBar);
          ctx.lineTo(x + 0.5, midY + halfBar);
        }
        ctx.stroke();
      }

      // Cursor vertical de reprodução (playhead)
      if (isPlaying || (activeAudio.currentTime && activeAudio.currentTime > 0.01)) {
        const px = Math.round(playheadX) + 0.5;
        ctx.strokeStyle = '#F4F4F5';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
      }
    }

    function loop() {
      if (!isPlaying) {
        rafId = null;
        return;
      }
      updateTimeReadout();
      drawWaveform();
      rafId = window.requestAnimationFrame(loop);
    }

    function updateUiPlaying(playing) {
      isPlaying = playing;
      if (playBtn) {
        playBtn.classList.toggle('is-playing', playing);
        const span = playBtn.querySelector('span');
        if (span) span.textContent = playing ? 'Pause' : 'Play / Pause';
      }
      if (audioLed) {
        audioLed.classList.remove('led--accent', 'led--pulse', 'led--idle');
        if (playing) {
          audioLed.classList.add('led--accent', 'led--pulse');
        } else {
          audioLed.classList.add('led--idle');
        }
      }
    }

    async function switchMode(newMode) {
      if (mode === newMode) return;
      const prevAudio = getActiveAudio();
      const currentPos = prevAudio.currentTime || 0;
      const wasPlaying = isPlaying;

      prevAudio.pause();
      mode = newMode;
      const nextAudio = getActiveAudio();

      if (Number.isFinite(nextAudio.duration) && nextAudio.duration > 0) {
        nextAudio.currentTime = Math.min(currentPos, Math.max(0, nextAudio.duration - 0.05));
      }

      if (wasPlaying) {
        try {
          await nextAudio.play();
          if (fileStatus) {
            fileStatus.textContent = mode === 'treated'
              ? 'Reproduzindo faixa B (Tratada)'
              : 'Reproduzindo faixa A (Bruta)';
          }
        } catch (_) {
          updateUiPlaying(false);
          if (fileStatus) fileStatus.textContent = 'Arquivo de áudio indisponível';
        }
      }
      updateTimeReadout();
      drawWaveform();
    }

    async function togglePlay() {
      const active = getActiveAudio();
      if (isPlaying) {
        active.pause();
        updateUiPlaying(false);
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        syncReadyStatus();
        drawWaveform();
        return;
      }

      try {
        await active.play();
        updateUiPlaying(true);
        if (fileStatus) {
          fileStatus.textContent = mode === 'treated'
            ? 'Reproduzindo faixa B (Tratada)'
            : 'Reproduzindo faixa A (Bruta)';
        }
        rafId = window.requestAnimationFrame(loop);
      } catch (_) {
        updateUiPlaying(false);
        if (fileStatus) {
          fileStatus.textContent = 'Arquivo de áudio indisponível';
        }
      }
    }

    function stop() {
      [rawAudio, treatedAudio].forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch (_) {
          // Ignora
        }
      });
      updateUiPlaying(false);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      syncReadyStatus();
      drawWaveform();
    }

    // Clique na forma de onda para posicionar o tempo de reprodução (scrubbing)
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const active = getActiveAudio();
      if (Number.isFinite(active.duration) && active.duration > 0) {
        active.currentTime = ratio * active.duration;
        updateTimeReadout();
        drawWaveform();
      }
    });

    [rawAudio, treatedAudio].forEach((a) => {
      a.addEventListener('ended', stop);
    });

    if (selectRawBtn) selectRawBtn.addEventListener('click', () => switchMode('raw'));
    if (selectTreatedBtn) selectTreatedBtn.addEventListener('click', () => switchMode('treated'));
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (stopBtn) stopBtn.addEventListener('click', stop);

    drawWaveform();
    return { stop, redraw: drawWaveform };
  }

  /* ========================================================================
     2. PLAYER NATIVO DE ARQUIVO MIDI (.MID) — PARSER SMF BINÁRIO OFFLINE
     ======================================================================== */
  function parseStandardMidiFile(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    let pos = 0;

    const readStr = (len) => {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(pos++));
      return s;
    };

    const readVarLen = () => {
      let value = 0;
      while (pos < view.byteLength) {
        const b = view.getUint8(pos++);
        value = (value << 7) | (b & 0x7f);
        if ((b & 0x80) === 0) break;
      }
      return value;
    };

    if (readStr(4) !== 'MThd') throw new Error('Cabeçalho MIDI inválido');
    const hdrLen = view.getUint32(pos); pos += 4;
    pos += 2; // format
    const numTracks = view.getUint16(pos); pos += 2;
    const division = view.getUint16(pos); pos += 2;
    pos = 8 + hdrLen;

    const ticksPerBeat = division & 0x7fff;
    const rawEvents = [];
    const tempoEvents = [{ tick: 0, usPerBeat: 500000 }]; // 120 BPM default

    for (let t = 0; t < numTracks && pos < view.byteLength; t++) {
      const chunkId = readStr(4);
      const trackLen = view.getUint32(pos); pos += 4;
      const trackEnd = Math.min(view.byteLength, pos + trackLen);

      if (chunkId !== 'MTrk') {
        pos = trackEnd;
        continue;
      }

      let absTick = 0;
      let runningStatus = 0;

      while (pos < trackEnd) {
        absTick += readVarLen();
        if (pos >= trackEnd) break;

        let status = view.getUint8(pos);
        if (status < 0x80) {
          status = runningStatus;
        } else {
          pos++;
          if (status < 0xf0) runningStatus = status;
        }

        const msgType = status & 0xf0;

        if (status === 0xff) {
          const metaType = view.getUint8(pos++);
          const len = readVarLen();
          if (metaType === 0x51 && len === 3) {
            const us = (view.getUint8(pos) << 16) | (view.getUint8(pos + 1) << 8) | view.getUint8(pos + 2);
            tempoEvents.push({ tick: absTick, usPerBeat: us });
          }
          pos += len;
        } else if (status === 0xf0 || status === 0xf7) {
          const len = readVarLen();
          pos += len;
        } else if (msgType === 0x90 || msgType === 0x80) {
          const note = view.getUint8(pos++);
          const vel = view.getUint8(pos++);
          const isNoteOn = msgType === 0x90 && vel > 0;
          rawEvents.push({ tick: absTick, type: isNoteOn ? 'on' : 'off', note, vel, ch: status & 0x0f });
        } else if (msgType === 0xc0 || msgType === 0xd0) {
          pos += 1;
        } else {
          pos += 2;
        }
      }
      pos = trackEnd;
    }

    tempoEvents.sort((a, b) => a.tick - b.tick);
    rawEvents.sort((a, b) => a.tick - b.tick);

    const tickToSec = (targetTick) => {
      let sec = 0;
      let prevTick = 0;
      let curUs = 500000;
      for (let i = 0; i < tempoEvents.length; i++) {
        const te = tempoEvents[i];
        if (te.tick >= targetTick) break;
        sec += ((te.tick - prevTick) / ticksPerBeat) * (curUs / 1e6);
        prevTick = te.tick;
        curUs = te.usPerBeat;
      }
      sec += ((targetTick - prevTick) / ticksPerBeat) * (curUs / 1e6);
      return sec;
    };

    // Emparelha Note On / Note Off para obter notas com duração real
    const activeMap = new Map();
    const notes = [];
    rawEvents.forEach((ev) => {
      const key = `${ev.ch}-${ev.note}`;
      if (ev.type === 'on') {
        activeMap.set(key, ev);
      } else if (activeMap.has(key)) {
        const startEv = activeMap.get(key);
        activeMap.delete(key);
        const t0 = tickToSec(startEv.tick);
        const t1 = tickToSec(ev.tick);
        notes.push({
          time: t0,
          duration: Math.max(0.08, Math.min(3.0, t1 - t0)),
          midi: startEv.note,
          velocity: startEv.vel,
          channel: startEv.ch
        });
      }
    });

    notes.sort((a, b) => a.time - b.time);
    const totalDuration = notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0);
    return { notes, totalDuration };
  }

  function initStudioMidiPlayer() {
    const playBtn = document.getElementById('studioMidiPlayBtn');
    const stopBtn = document.getElementById('studioMidiStopBtn');
    const statusEl = document.getElementById('studioMidiStatus');
    const progressEl = document.getElementById('studioMidiProgress');
    const ledEl = document.getElementById('studioMidiLed');
    const pathEl = document.getElementById('studioMidiFilePath');

    if (!playBtn) return { stop: () => {} };

    const midiUrl = pathEl ? pathEl.textContent.trim() : 'assets/midi/composicao_autoral.mid';
    let parsedMidi = null;
    let isPlaying = false;
    let startCtxTime = 0;
    let nextIdx = 0;
    let timerId = null;

    function updateReadyBadge() {
      if (!parsedMidi || isPlaying) return;
      if (ledEl) {
        ledEl.classList.remove('led--idle', 'led--pulse');
        ledEl.classList.add('led--accent');
      }
      if (statusEl) {
        statusEl.textContent = `MIDI pronto (${parsedMidi.notes.length} notas · ${formatClock(parsedMidi.totalDuration)})`;
      }
    }

    async function ensureParsedMidi() {
      if (parsedMidi) return parsedMidi;
      try {
        const res = await fetch(midiUrl);
        if (!res.ok) throw new Error('HTTP');
        const ab = await res.arrayBuffer();
        parsedMidi = parseStandardMidiFile(ab);
      } catch (_) {
        try {
          parsedMidi = parseStandardMidiFile(base64ToArrayBuffer(EMBEDDED_MIDI_B64));
        } catch (__) {
          parsedMidi = null;
        }
      }
      updateReadyBadge();
      return parsedMidi;
    }

    // Pré-carrega imediatamente para exibir contagem de notas e duração sem delay
    ensureParsedMidi();

    function stop() {
      isPlaying = false;
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
      playBtn.classList.remove('is-playing');
      playBtn.textContent = 'Reproduzir';
      if (ledEl) {
        ledEl.classList.remove('led--pulse');
        ledEl.classList.add('led--accent');
      }
      if (progressEl) progressEl.style.width = '0%';
      updateReadyBadge();
    }

    async function start() {
      const eng = global.studioAudioEngine;
      if (!eng) return;
      const ctx = eng.ensureContext();
      if (!ctx) return;

      const midi = await ensureParsedMidi();
      if (!midi || !midi.notes.length) {
        if (statusEl) statusEl.textContent = 'Arquivo .mid indisponível';
        return;
      }

      isPlaying = true;
      nextIdx = 0;
      startCtxTime = ctx.currentTime + 0.06;
      playBtn.classList.add('is-playing');
      playBtn.textContent = 'Pausar / Parar';

      if (ledEl) {
        ledEl.classList.remove('led--idle');
        ledEl.classList.add('led--accent', 'led--pulse');
      }

      timerId = window.setInterval(() => {
        if (!isPlaying) return;
        const elapsed = ctx.currentTime - startCtxTime;
        const pcmToggle = document.getElementById('midiEnginePCM');
        const selectedMode = pcmToggle && pcmToggle.classList.contains('is-selected') ? 'pcm' : 'fm';

        while (nextIdx < midi.notes.length && midi.notes[nextIdx].time <= elapsed + 0.12) {
          const n = midi.notes[nextIdx++];
          if (n.channel === 9) continue; // ignora canal de percussão GM se houver
          const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
          eng.playMidiNote(freq, selectedMode, n.velocity, startCtxTime + n.time, n.duration);
        }

        const pct = midi.totalDuration > 0
          ? Math.min(100, Math.max(0, (elapsed / midi.totalDuration) * 100))
          : 0;
        if (progressEl) progressEl.style.width = `${pct.toFixed(1)}%`;
        if (statusEl) {
          statusEl.textContent = `${formatClock(Math.max(0, elapsed))} / ${formatClock(midi.totalDuration)}`;
        }

        if (elapsed > midi.totalDuration + 0.3) {
          stop();
        }
      }, 30);
    }

    playBtn.addEventListener('click', () => {
      if (isPlaying) stop();
      else start();
    });

    if (stopBtn) stopBtn.addEventListener('click', stop);
    return { stop };
  }

  /* ========================================================================
     BOOT
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    if (global.StudioApp) {
      global.StudioApp.studioLoaded = true;
    }

    const abCtrl = initAudioABComparator();
    const midiPlayerCtrl = initStudioMidiPlayer();

    window.addEventListener('studio:tabchange', (event) => {
      const tabId = event.detail && event.detail.tabId;
      if (tabId !== 'estudio-autoral') {
        abCtrl.stop();
      } else {
        window.requestAnimationFrame(() => {
          abCtrl.redraw();
        });
      }

      if (tabId !== 'sintese-midi-voz') {
        midiPlayerCtrl.stop();
      }
    });

    window.addEventListener('resize', () => {
      if (global.StudioApp && global.StudioApp.getActiveTab() === 'estudio-autoral') {
        abCtrl.redraw();
      }
    });
  });
})(window);
