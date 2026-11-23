/**
 * STUDIO AUDIO WORKBENCH — Fase 2: Simuladores Interativos e Renderização Canvas 60fps
 * Abas implementadas:
 * - Física do Som & Fourier (Síntese Aditiva 4 harmônicos + animação SVG do alto-falante)
 * - Digitalização & Modulação PCM (PAM, Quantização 2^v, Nyquist/Aliasing, Hover X_s/X_sq/Erro/Binário, Bitcrusher)
 * - Compressão & Formatos (Calculadora dinâmica de bitrate, Bytes/KB/MB e barras proporcionais)
 * - Processamento, Síntese, MIDI & Voz (EQ 5 bandas BiquadFilterNode + FFT real + Piano Roll FM/PCM + Event List)
 */

(function (global) {
  'use strict';

  const engine = new global.StudioAudioEngine();
  global.studioAudioEngine = engine;

  // Helpers utilitários
  function setupCanvasHiDpi(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : canvas.width;
    const h = rect.height > 0 ? rect.height : canvas.height;
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function syncSliderVisual(input) {
    if (global.StudioApp && typeof global.StudioApp.updateSliderFill === 'function') {
      global.StudioApp.updateSliderFill(input);
    }
  }

  function freqToNoteName(freq) {
    if (!freq || freq < 20) return '--';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midiNum = Math.round(69 + 12 * Math.log2(freq / 440));
    const octave = Math.floor(midiNum / 12) - 1;
    const name = noteNames[((midiNum % 12) + 12) % 12];
    return `${name}${octave}`;
  }

  function formatPtNumber(num, decimals = 0) {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatByteSize(bytes) {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function setPlayButtonVisual(btn, playing, playLabel, stopLabel) {
    if (!btn) return;
    btn.dataset.state = playing ? 'playing' : 'stopped';
    btn.classList.toggle('is-playing', playing);
    const span = btn.querySelector('span');
    if (span) span.textContent = playing ? stopLabel : playLabel;
  }

  /* ========================================================================
     ABA 1: FÍSICA DO SOM & FOURIER + ANIMAÇÃO DO TRANSDUTOR SVG
     ======================================================================== */
  function initFourierSimulator() {
    const canvas = document.getElementById('fourierCanvas');
    const playBtn = document.getElementById('fourierPlayBtn');
    const led = document.getElementById('fourierLed');
    const baseFreqInput = document.getElementById('fourierBaseFreq');
    const baseFreqVal = document.getElementById('fourierBaseFreqVal');
    const baseFreqBadge = document.getElementById('fourierBaseFreqBadge');
    const powerReadout = document.getElementById('fourierPowerReadout');

    const hInputs = [
      document.getElementById('fourierH1'),
      document.getElementById('fourierH2'),
      document.getElementById('fourierH3'),
      document.getElementById('fourierH4')
    ];
    const hVals = [
      document.getElementById('fourierH1Val'),
      document.getElementById('fourierH2Val'),
      document.getElementById('fourierH3Val'),
      document.getElementById('fourierH4Val')
    ];

    // Elementos SVG do Alto-Falante
    const coilGroup = document.getElementById('speakerCoilGroup');
    const coneGroup = document.getElementById('speakerConeGroup');
    const waveEls = [
      document.getElementById('speakerWave1'),
      document.getElementById('speakerWave2'),
      document.getElementById('speakerWave3'),
      document.getElementById('speakerWave4')
    ];
    const displacementReadout = document.getElementById('speakerDisplacementReadout');

    if (!canvas || !baseFreqInput || hInputs.some((el) => !el)) return { stop: () => {}, redraw: () => {} };

    const harmonicColors = [
      'rgba(56, 189, 248, 0.42)',
      'rgba(161, 161, 170, 0.34)',
      'rgba(255, 138, 76, 0.32)',
      'rgba(113, 113, 122, 0.34)'
    ];

    let phase = 0;
    let rafId = null;
    let lastTimestamp = 0;

    function getState() {
      const baseFreq = parseFloat(baseFreqInput.value) || 220;
      const amps = hInputs.map((inp) => parseFloat(inp.value) || 0);
      return { baseFreq, amps };
    }

    function updateReadouts() {
      const { baseFreq, amps } = getState();
      if (baseFreqVal) baseFreqVal.textContent = `${baseFreq} Hz`;
      if (baseFreqBadge) baseFreqBadge.textContent = `${baseFreq} Hz`;

      let powerSum = 0;
      amps.forEach((amp, idx) => {
        if (hVals[idx]) hVals[idx].textContent = amp.toFixed(2);
        powerSum += amp * amp;
      });

      if (powerReadout) powerReadout.textContent = powerSum.toFixed(2);
    }

    function animateSpeakerSvg(instantNorm, totalAmp, active) {
      const clamped = Math.max(-1, Math.min(1, instantNorm));
      const maxPx = 9.5;
      const dx = active ? clamped * maxPx : 0;

      const tx = `translate(${dx.toFixed(2)}, 0)`;
      if (coilGroup) coilGroup.setAttribute('transform', tx);
      if (coneGroup) coneGroup.setAttribute('transform', tx);

      const baseOpacities = [0.92, 0.72, 0.54, 0.36];
      waveEls.forEach((wEl, idx) => {
        if (!wEl) return;
        if (!active || totalAmp < 0.02) {
          wEl.setAttribute('transform', 'translate(0, 0)');
          wEl.setAttribute('opacity', String(baseOpacities[idx]));
          return;
        }
        const waveShift = ((phase * 1.4 - idx * 0.75) % (Math.PI * 2));
        const pulse = 0.5 + 0.5 * Math.sin(waveShift);
        const shiftPx = (pulse * 8 * Math.min(1.2, totalAmp)).toFixed(2);
        const op = Math.max(0.14, Math.min(1, baseOpacities[idx] * (0.45 + 0.75 * pulse) * Math.min(1.2, totalAmp + 0.25)));
        wEl.setAttribute('transform', `translate(${shiftPx}, 0)`);
        wEl.setAttribute('opacity', op.toFixed(2));
      });

      if (displacementReadout) {
        const mm = active ? clamped * 2.4 : 0;
        const sign = mm > 0.005 ? '+' : '';
        displacementReadout.textContent = `${sign}${mm.toFixed(2)} mm`;
      }
    }

    function drawFourier() {
      const setup = setupCanvasHiDpi(canvas);
      if (!setup) return;
      const { ctx, w, h } = setup;
      const { baseFreq, amps } = getState();

      // Fundo e grade técnica
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#18181C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        const x = Math.round((w / 10) * i) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let j = 1; j < 6; j++) {
        const y = Math.round((h / 6) * j) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Linha central (0 V)
      const midY = Math.round(h / 2) + 0.5;
      ctx.strokeStyle = '#27272A';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      const cycles = 2.0 + ((baseFreq - 110) / 770) * 2.5; // mais ciclos visíveis conforme f0 sobe
      const ampSum = amps.reduce((a, b) => a + b, 0);
      const scaleMax = Math.max(1.0, ampSum);
      const verticalScale = (h * 0.39) / scaleMax;

      // 1. Ondas harmônicas individuais (linhas finas translúcidas)
      for (let n = 0; n < 4; n++) {
        if (amps[n] <= 0.001) continue;
        const harmonicMult = n + 1;
        ctx.strokeStyle = harmonicColors[n];
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const theta = (x / w) * Math.PI * 2 * cycles * harmonicMult - phase * harmonicMult;
          const y = midY - Math.sin(theta) * amps[n] * verticalScale;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Onda complexa resultante (linha principal vibrante #FF5500)
      ctx.strokeStyle = '#FF5500';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 1.5) {
        let sum = 0;
        for (let n = 0; n < 4; n++) {
          if (amps[n] <= 0.001) continue;
          const harmonicMult = n + 1;
          const theta = (x / w) * Math.PI * 2 * cycles * harmonicMult - phase * harmonicMult;
          sum += amps[n] * Math.sin(theta);
        }
        const y = midY - sum * verticalScale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Legenda discreta no canto superior esquerdo
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#A1A1AA';
      ctx.fillText(`f0=${baseFreq}Hz  2f0=${baseFreq * 2}Hz  3f0=${baseFreq * 3}Hz  4f0=${baseFreq * 4}Hz`, 10, 16);
    }

    function stepAnimation(timestamp) {
      if (!engine.fourier.active) {
        rafId = null;
        return;
      }
      const dt = lastTimestamp ? Math.min(0.05, (timestamp - lastTimestamp) / 1000) : 0.016;
      lastTimestamp = timestamp;

      const { baseFreq, amps } = getState();
      // Velocidade visual legível proporcional à frequência fundamental
      const angularSpeed = 4.2 + ((baseFreq - 110) / 770) * 6.5;
      phase = (phase + dt * angularSpeed) % (Math.PI * 200);

      drawFourier();

      // Calcula deslocamento instantâneo da soma dos harmônicos para o cone do alto-falante
      let instant = 0;
      let ampSum = 0;
      for (let n = 0; n < 4; n++) {
        instant += amps[n] * Math.sin(phase * (n + 1));
        ampSum += amps[n];
      }
      const normalizedInstant = ampSum > 0 ? instant / Math.max(1, ampSum) : 0;
      animateSpeakerSvg(normalizedInstant, ampSum, true);

      rafId = window.requestAnimationFrame(stepAnimation);
    }

    function stop() {
      engine.stopFourier();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTimestamp = 0;
      setPlayButtonVisual(playBtn, false, 'Play / Stop', 'Stop');
      if (led) {
        led.classList.remove('led--accent', 'led--pulse');
        led.classList.add('led--idle');
      }
      animateSpeakerSvg(0, 0, false);
      drawFourier();
    }

    function togglePlay() {
      if (engine.fourier.active) {
        stop();
      } else {
        const { baseFreq, amps } = getState();
        if (engine.startFourier(baseFreq, amps)) {
          setPlayButtonVisual(playBtn, true, 'Play / Stop', 'Stop');
          if (led) {
            led.classList.remove('led--idle');
            led.classList.add('led--accent', 'led--pulse');
          }
          lastTimestamp = 0;
          rafId = window.requestAnimationFrame(stepAnimation);
        }
      }
    }

    const onParamInput = () => {
      updateReadouts();
      const { baseFreq, amps } = getState();
      if (engine.fourier.active) {
        engine.updateFourier(baseFreq, amps);
      } else {
        drawFourier();
      }
    };

    baseFreqInput.addEventListener('input', onParamInput);
    hInputs.forEach((inp) => inp.addEventListener('input', onParamInput));
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    // Presets de forma de onda
    const presetMap = {
      sine:   { amps: [1.0, 0.0, 0.0, 0.0] },
      square: { amps: [1.0, 0.0, 0.35, 0.0] },
      saw:    { amps: [1.0, 0.5, 0.35, 0.25] },
      reset:  { freq: 220, amps: [1.0, 0.0, 0.0, 0.0] }
    };

    document.querySelectorAll('[data-fourier-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = presetMap[btn.getAttribute('data-fourier-preset')];
        if (!preset) return;
        if (preset.freq !== undefined) {
          baseFreqInput.value = String(preset.freq);
          syncSliderVisual(baseFreqInput);
        }
        preset.amps.forEach((val, idx) => {
          hInputs[idx].value = val.toFixed(2);
          syncSliderVisual(hInputs[idx]);
        });
        onParamInput();
      });
    });

    updateReadouts();
    drawFourier();

    return { stop, redraw: drawFourier };
  }

  /* ========================================================================
     ABA 2: DIGITALIZAÇÃO & MODULAÇÃO PCM (NYQUIST, QUANTIZAÇÃO, HOVER, ÁUDIO)
     ======================================================================== */
  function initPcmWorkbench() {
    const signalCanvas = document.getElementById('pcmSignalCanvas');
    const errorCanvas = document.getElementById('pcmErrorCanvas');
    const freqInput = document.getElementById('pcmSignalFreq');
    const srInput = document.getElementById('pcmSampleRate');
    const bitsInput = document.getElementById('pcmBitDepth');
    const sampleIdxInput = document.getElementById('pcmSampleIndex');

    const freqVal = document.getElementById('pcmSignalFreqVal');
    const srVal = document.getElementById('pcmSampleRateVal');
    const periodVal = document.getElementById('pcmSamplePeriodVal');
    const bitsVal = document.getElementById('pcmBitDepthVal');
    const levelsVal = document.getElementById('pcmLevelsVal');

    const alertBox = document.getElementById('pcmAliasingAlert');
    const alertLed = document.getElementById('pcmAliasingLed');
    const alertTitle = document.getElementById('pcmAliasingTitle');
    const alertSub = document.getElementById('pcmAliasingSub');
    const nyquistRatio = document.getElementById('pcmNyquistRatio');

    const idxVal = document.getElementById('pcmSampleIndexVal');
    const xsOut = document.getElementById('pcmReadoutXs');
    const xsqOut = document.getElementById('pcmReadoutXsq');
    const errOut = document.getElementById('pcmReadoutError');
    const binOut = document.getElementById('pcmReadoutBinary');

    const audioBtn = document.getElementById('pcmAudioTestBtn');
    const audioLed = document.getElementById('pcmAudioLed');

    if (!signalCanvas || !errorCanvas || !freqInput || !srInput || !bitsInput) {
      return { stop: () => {}, redraw: () => {} };
    }

    const WINDOW_SEC = 0.0025; // Janela fixa de 2.5 ms (excelente leitura entre 200 Hz e 6 kHz)
    let currentSamples = [];
    let selectedSampleIdx = 2;

    function getParams() {
      const fMax = parseFloat(freqInput.value) || 1000;
      const fSample = parseFloat(srInput.value) || 8000;
      const bits = parseInt(bitsInput.value, 10) || 3;
      const levels = Math.pow(2, bits);
      return { fMax, fSample, bits, levels };
    }

    function computeSamples() {
      const { fMax, fSample, bits, levels } = getParams();
      const maxLevel = levels - 1;
      const dt = 1 / fSample;
      const count = Math.max(2, Math.floor(WINDOW_SEC * fSample) + 1);
      const samples = [];

      for (let i = 0; i < count; i++) {
        const t = i * dt;
        const yNorm = Math.sin(2 * Math.PI * fMax * t); // [-1, 1]
        const xs = ((yNorm + 1) * 0.5) * maxLevel;       // [0, q-1]
        const xsq = Math.max(0, Math.min(maxLevel, Math.round(xs)));
        const signedErr = xsq - xs;
        const absErr = Math.abs(xs - xsq);
        const binary = xsq.toString(2).padStart(bits, '0');
        const qNorm = (xsq / maxLevel) * 2 - 1;          // [-1, 1]

        samples.push({ index: i, t, yNorm, qNorm, xs, xsq, signedErr, absErr, binary });
      }

      currentSamples = samples;

      if (sampleIdxInput) {
        sampleIdxInput.max = String(Math.max(0, samples.length - 1));
        if (selectedSampleIdx >= samples.length) {
          selectedSampleIdx = samples.length - 1;
        }
        sampleIdxInput.value = String(selectedSampleIdx);
        syncSliderVisual(sampleIdxInput);
      }

      return samples;
    }

    function updateInspectorReadouts() {
      const sample = currentSamples[selectedSampleIdx] || currentSamples[0];
      if (!sample) return;

      if (idxVal) idxVal.textContent = `#${String(sample.index).padStart(2, '0')}`;
      if (xsOut) xsOut.textContent = sample.xs.toFixed(2);
      if (xsqOut) xsqOut.textContent = String(sample.xsq);
      if (errOut) errOut.textContent = sample.absErr.toFixed(2);
      if (binOut) binOut.textContent = sample.binary;
    }

    function updateHeaderMetrics() {
      const { fMax, fSample, bits, levels } = getParams();
      const taUs = (1 / fSample) * 1e6;
      const ratio = fSample / fMax;
      const isAliasing = fSample < 2 * fMax;

      if (freqVal) freqVal.textContent = `${formatPtNumber(fMax)} Hz`;
      if (srVal) srVal.textContent = `${formatPtNumber(fSample)} Hz`;
      if (periodVal) {
        periodVal.textContent = taUs >= 1000
          ? `Ta = ${(taUs / 1000).toFixed(2)} ms`
          : `Ta = ${taUs.toFixed(1)} µs`;
      }
      if (bitsVal) bitsVal.textContent = `${bits} bits`;
      if (levelsVal) levelsVal.textContent = `q = 2^${bits} = ${levels}`;
      if (nyquistRatio) nyquistRatio.textContent = `Fa / Fmax = ${ratio.toFixed(2)}x`;

      if (alertBox) alertBox.classList.toggle('is-aliasing', isAliasing);
      if (alertLed) {
        alertLed.classList.remove('led--ok', 'led--red', 'led--pulse');
        if (isAliasing) {
          alertLed.classList.add('led--red', 'led--pulse');
        } else {
          alertLed.classList.add('led--ok');
        }
      }

      if (alertTitle && alertSub) {
        if (isAliasing) {
          const aliasFreq = Math.abs(fMax - fSample * Math.round(fMax / fSample));
          alertTitle.textContent = 'ALERTA DE ALIASING — Violação do Critério de Nyquist';
          alertSub.textContent = `Fa (${formatPtNumber(fSample)} Hz) < 2 · Fmax (${formatPtNumber(2 * fMax)} Hz). Frequência fantasma reconstruída: ~${formatPtNumber(Math.round(aliasFreq))} Hz.`;
        } else {
          alertTitle.textContent = 'Critério de Nyquist atendido';
          alertSub.textContent = `Fa (${formatPtNumber(fSample)} Hz) ≥ 2 · Fmax (${formatPtNumber(2 * fMax)} Hz). Reconstrução íntegra sem sobreposição espectral.`;
        }
      }
    }

    function drawPcmCanvases() {
      const { fMax, fSample, levels } = getParams();
      const samples = computeSamples();
      updateHeaderMetrics();
      updateInspectorReadouts();

      const isAliasing = fSample < 2 * fMax;
      const padX = 28;
      const padY = 18;

      // ---------- 1. pcmSignalCanvas ----------
      const sig = setupCanvasHiDpi(signalCanvas);
      if (sig) {
        const { ctx, w, h } = sig;
        const plotW = w - padX * 2;
        const plotH = h - padY * 2;
        const midY = padY + plotH / 2;

        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, w, h);

        // Níveis horizontais de quantização
        const guideCount = levels <= 16 ? levels : 9;
        ctx.strokeStyle = '#18181C';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let g = 0; g < guideCount; g++) {
          const norm = guideCount > 1 ? g / (guideCount - 1) : 0.5;
          const y = Math.round(padY + (1 - norm) * plotH) + 0.5;
          ctx.moveTo(padX, y);
          ctx.lineTo(w - padX, y);
        }
        ctx.stroke();

        // Eixo central
        ctx.strokeStyle = '#27272A';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padX, Math.round(midY) + 0.5);
        ctx.lineTo(w - padX, Math.round(midY) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Curva analógica contínua original (#38BDF8)
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        const curveSteps = Math.max(240, Math.floor(plotW));
        for (let i = 0; i <= curveSteps; i++) {
          const frac = i / curveSteps;
          const t = frac * WINDOW_SEC;
          const yVal = Math.sin(2 * Math.PI * fMax * t);
          const x = padX + frac * plotW;
          const y = midY - yVal * (plotH * 0.48);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Onda fantasma reconstruída (Aliasing) quando Fa < 2 * Fmax
        if (isAliasing) {
          const kFold = Math.round(fMax / fSample);
          const fAliasSigned = fMax - kFold * fSample;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          for (let i = 0; i <= curveSteps; i++) {
            const frac = i / curveSteps;
            const t = frac * WINDOW_SEC;
            const yAlias = Math.sin(2 * Math.PI * fAliasSigned * t);
            const x = padX + frac * plotW;
            const y = midY - yAlias * (plotH * 0.48);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Pulsos PAM verticais
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = padX + (s.t / WINDOW_SEC) * plotW;
          const yPam = midY - s.yNorm * (plotH * 0.48);
          const isSelected = i === selectedSampleIdx;

          ctx.strokeStyle = isSelected ? '#F4F4F5' : 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = isSelected ? 1.8 : 1;
          ctx.beginPath();
          ctx.moveTo(x, midY);
          ctx.lineTo(x, yPam);
          ctx.stroke();
        }

        // Linha em escada quantizada (#FF5500)
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const xStart = padX + (s.t / WINDOW_SEC) * plotW;
          const xEnd = i + 1 < samples.length
            ? padX + (samples[i + 1].t / WINDOW_SEC) * plotW
            : w - padX;
          const yQ = midY - s.qNorm * (plotH * 0.48);
          if (i === 0) ctx.moveTo(xStart, yQ);
          else ctx.lineTo(xStart, yQ);
          ctx.lineTo(xEnd, yQ);
        }
        ctx.stroke();

        // Pontos de amostra + destaque do ponto inspecionado
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const x = padX + (s.t / WINDOW_SEC) * plotW;
          const yQ = midY - s.qNorm * (plotH * 0.48);
          const yPam = midY - s.yNorm * (plotH * 0.48);
          const isSelected = i === selectedSampleIdx;

          if (isSelected) {
            ctx.strokeStyle = 'rgba(244, 244, 245, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padY);
            ctx.lineTo(x, h - padY);
            ctx.stroke();

            // Segmento vertical de erro entre amostra original e nível quantizado
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x, yPam);
            ctx.lineTo(x, yQ);
            ctx.stroke();
          }

          ctx.fillStyle = isSelected ? '#F4F4F5' : '#FF5500';
          ctx.beginPath();
          ctx.arc(x, yQ, isSelected ? 4.2 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Escala numérica lateral esquerda (0 .. q-1)
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#71717A';
        ctx.fillText(String(levels - 1), 4, padY + 7);
        ctx.fillText('0', 4, h - padY + 2);
      }

      // ---------- 2. pcmErrorCanvas ----------
      const errC = setupCanvasHiDpi(errorCanvas);
      if (errC) {
        const { ctx, w, h } = errC;
        const plotW = w - padX * 2;
        const plotH = h - 22;
        const midY = 11 + plotH / 2;

        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, w, h);

        // Limites +/- 0.5 passo (+q/2 e -q/2)
        const boundOffset = plotH * 0.4;
        ctx.strokeStyle = '#222226';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padX, midY - boundOffset);
        ctx.lineTo(w - padX, midY - boundOffset);
        ctx.moveTo(padX, midY + boundOffset);
        ctx.lineTo(w - padX, midY + boundOffset);
        ctx.stroke();
        ctx.setLineDash([]);

        // Eixo 0
        ctx.strokeStyle = '#2E2E34';
        ctx.beginPath();
        ctx.moveTo(padX, Math.round(midY) + 0.5);
        ctx.lineTo(w - padX, Math.round(midY) + 0.5);
        ctx.stroke();

        // Curva dente-de-serra do erro contínuo e(t) = X_sq(t) - X_s(t)
        const maxLevel = levels - 1;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const steps = Math.max(280, Math.floor(plotW));
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const t = frac * WINDOW_SEC;
          const sampleIdx = Math.min(samples.length - 1, Math.floor(t * fSample));
          const heldQ = samples[sampleIdx] ? samples[sampleIdx].xsq : 0;
          const exactXs = ((Math.sin(2 * Math.PI * fMax * t) + 1) * 0.5) * maxLevel;
          // Erro em unidades de intervalo de quantização (normalizado para visualização clara)
          const diff = Math.max(-1.2, Math.min(1.2, heldQ - exactXs));
          const x = padX + frac * plotW;
          const y = midY - diff * boundOffset * 1.45;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Marcador da amostra inspecionada
        const activeSample = samples[selectedSampleIdx];
        if (activeSample) {
          const x = padX + (activeSample.t / WINDOW_SEC) * plotW;
          const y = midY - activeSample.signedErr * boundOffset * 1.45;
          ctx.strokeStyle = 'rgba(244, 244, 245, 0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 6);
          ctx.lineTo(x, h - 6);
          ctx.stroke();

          ctx.fillStyle = '#F4F4F5';
          ctx.beginPath();
          ctx.arc(x, y, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#71717A';
        ctx.fillText('+q/2', 2, midY - boundOffset + 3);
        ctx.fillText('-q/2', 2, midY + boundOffset + 3);
      }
    }

    function handleCanvasHover(event) {
      if (!currentSamples.length) return;
      const rect = signalCanvas.getBoundingClientRect();
      const padX = 28;
      const plotW = Math.max(1, rect.width - padX * 2);
      const relX = Math.max(0, Math.min(plotW, event.clientX - rect.left - padX));
      const hoverT = (relX / plotW) * WINDOW_SEC;

      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < currentSamples.length; i++) {
        const dist = Math.abs(currentSamples[i].t - hoverT);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      if (closestIdx !== selectedSampleIdx) {
        selectedSampleIdx = closestIdx;
        if (sampleIdxInput) {
          sampleIdxInput.value = String(selectedSampleIdx);
          syncSliderVisual(sampleIdxInput);
        }
        drawPcmCanvases();
      }
    }

    function stop() {
      engine.stopPcmAudio();
      setPlayButtonVisual(audioBtn, false, 'Ouvir Degradação', 'Parar Áudio');
      if (audioLed) {
        audioLed.classList.remove('led--accent', 'led--pulse');
        audioLed.classList.add('led--idle');
      }
    }

    function togglePcmAudio() {
      if (engine.pcm.active) {
        stop();
      } else {
        const { fMax, fSample, bits } = getParams();
        if (engine.startPcmAudio(fMax, fSample, bits)) {
          setPlayButtonVisual(audioBtn, true, 'Ouvir Degradação', 'Parar Áudio');
          if (audioLed) {
            audioLed.classList.remove('led--idle');
            audioLed.classList.add('led--accent', 'led--pulse');
          }
        }
      }
    }

    const onParamChange = () => {
      drawPcmCanvases();
      if (engine.pcm.active) {
        const { fMax, fSample, bits } = getParams();
        engine.updatePcmAudio(fMax, fSample, bits);
      }
    };

    freqInput.addEventListener('input', onParamChange);
    srInput.addEventListener('input', onParamChange);
    bitsInput.addEventListener('input', onParamChange);

    if (sampleIdxInput) {
      sampleIdxInput.addEventListener('input', () => {
        selectedSampleIdx = parseInt(sampleIdxInput.value, 10) || 0;
        drawPcmCanvases();
      });
    }

    signalCanvas.addEventListener('mousemove', handleCanvasHover);
    if (audioBtn) audioBtn.addEventListener('click', togglePcmAudio);

    // Presets da bancada PCM
    const pcmPresets = {
      telephony: { fMax: 1000, fSample: 8000, bits: 8 },
      lofi:      { fMax: 1000, fSample: 8000, bits: 3 },
      aliasing:  { fMax: 3400, fSample: 4000, bits: 5 }
    };

    document.querySelectorAll('[data-pcm-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = pcmPresets[btn.getAttribute('data-pcm-preset')];
        if (!p) return;
        freqInput.value = String(p.fMax);
        srInput.value = String(p.fSample);
        bitsInput.value = String(p.bits);
        [freqInput, srInput, bitsInput].forEach(syncSliderVisual);
        onParamChange();
      });
    });

    drawPcmCanvases();

    return { stop, redraw: drawPcmCanvases };
  }

  /* ========================================================================
     ABA 3: COMPRESSÃO & FORMATOS — CALCULADORA DE BITRATE E ARMAZENAMENTO
     ======================================================================== */
  function initBitrateCalculator() {
    const durationInput = document.getElementById('calcDuration');
    const durationVal = document.getElementById('calcDurationVal');
    const monoBtn = document.getElementById('calcChannelsMono');
    const stereoBtn = document.getElementById('calcChannelsStereo');

    if (!durationInput) return { redraw: () => {} };

    let channels = 2; // Estéreo padrão

    function formatDurationClock(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${sec} s (${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`;
    }

    function updateCalculations() {
      const duration = parseInt(durationInput.value, 10) || 60;
      if (durationVal) durationVal.textContent = formatDurationClock(duration);

      const wavBytesPerSec = 44100 * 2 * channels;           // 88.200 (mono) ou 176.400 (estéreo)
      const flacBytesPerSec = wavBytesPerSec * 0.55;         // ~55% do WAV sem perdas
      const chFactor = channels === 1 ? 0.5 : 1.0;

      const items = [
        {
          id: 'wav-cd',
          kbps: (wavBytesPerSec * 8) / 1000,
          bytesPerSec: wavBytesPerSec,
          approx: false
        },
        {
          id: 'flac',
          kbps: (flacBytesPerSec * 8) / 1000,
          bytesPerSec: flacBytesPerSec,
          approx: true
        },
        {
          id: 'ac3',
          kbps: 384,
          bytesPerSec: (384 * 1000) / 8,
          approx: false,
          note: '5.1'
        },
        {
          id: 'mp3-320',
          kbps: 320 * chFactor,
          bytesPerSec: (320 * chFactor * 1000) / 8,
          approx: false
        },
        {
          id: 'mp3-128',
          kbps: 128 * chFactor,
          bytesPerSec: (128 * chFactor * 1000) / 8,
          approx: false
        },
        {
          id: 'mp3-96',
          kbps: 96 * chFactor,
          bytesPerSec: (96 * chFactor * 1000) / 8,
          approx: false
        },
        {
          id: 'opus',
          kbps: 64 * chFactor,
          bytesPerSec: (64 * chFactor * 1000) / 8,
          approx: false
        },
        {
          id: 'pcm-voice',
          kbps: 64,
          bytesPerSec: 8000,
          approx: false,
          note: '1 ch'
        },
        {
          id: 'midi',
          kbps: 1.6,
          bytesPerSec: 200,
          approx: true
        }
      ];

      const maxBytesPerSec = Math.max(...items.map((it) => it.bytesPerSec));

      items.forEach((item) => {
        const totalBytes = item.bytesPerSec * duration;
        const pct = Math.max(1.2, (item.bytesPerSec / maxBytesPerSec) * 100);
        const prefix = item.approx ? '~' : '';
        const bpsText = `${prefix}${formatPtNumber(Math.round(item.bytesPerSec))} bytes/s`;
        const kbpsDecimals = item.kbps % 1 !== 0 ? 1 : 0;
        const kbpsText = `${prefix}${formatPtNumber(item.kbps, kbpsDecimals)} kbps${item.note ? ` · ${item.note}` : ''}`;

        const rateEl = document.getElementById(`rate-${item.id}`);
        const sizeEl = document.getElementById(`size-${item.id}`);
        const barEl = document.getElementById(`bar-${item.id}`);

        if (rateEl) rateEl.textContent = `${bpsText} (${kbpsText})`;
        if (sizeEl) sizeEl.textContent = formatByteSize(totalBytes);
        if (barEl) barEl.style.width = `${pct.toFixed(2)}%`;
      });
    }

    durationInput.addEventListener('input', updateCalculations);

    if (monoBtn) {
      monoBtn.addEventListener('click', () => {
        channels = 1;
        updateCalculations();
      });
    }
    if (stereoBtn) {
      stereoBtn.addEventListener('click', () => {
        channels = 2;
        updateCalculations();
      });
    }

    updateCalculations();
    return { redraw: updateCalculations };
  }

  /* ========================================================================
     ABA 4A: EQUALIZADOR GRÁFICO 5 BANDAS (BIQUADFILTERNODE) + FFT REAL
     ======================================================================== */
  function initEqAndFft() {
    const fftCanvas = document.getElementById('fftCanvas');
    const playBtn = document.getElementById('eqPlayBtn');
    const resetBtn = document.getElementById('eqResetBtn');
    const eqLed = document.getElementById('eqLed');
    const audioEl = document.getElementById('eqAudioSource');
    const statusEl = document.getElementById('eqAudioStatus');
    const fileLed = document.getElementById('eqAudioFileLed');
    const peakFreqEl = document.getElementById('fftProminentFreq');
    const peakDbEl = document.getElementById('fftProminentDb');

    const bandKeys = ['62', '250', '1k', '4k', '16k'];
    const bandFreqs = [62, 250, 1000, 4000, 16000];
    const bandInputs = {};
    const bandReadouts = {};

    bandKeys.forEach((k) => {
      bandInputs[k] = document.getElementById(`eqBand${k}`);
      bandReadouts[k] = document.getElementById(`eqVal${k}`);
    });

    if (!fftCanvas) return { stop: () => {}, redraw: () => {} };

    // Presets de formantes (ajustam o EQ real de acordo com cada registro vocal gravado)
    const vowelEqPresets = {
      'a-low':  { '62': 2.0,  '250': 4.5,  '1k': 6.0,  '4k': -2.0,  '16k': -6.0 },
      'a-high': { '62': -4.0, '250': 2.5,  '1k': 5.5,  '4k': 4.5,   '16k': -1.0 },
      'u-low':  { '62': 5.0,  '250': 7.5,  '1k': -5.0, '4k': -12.0, '16k': -14.0 }
    };

    const MIN_FREQ = 40;
    const MAX_FREQ = 18000;
    const LOG_MIN = Math.log10(MIN_FREQ);
    const LOG_MAX = Math.log10(MAX_FREQ);

    let rafId = null;
    let currentSampleUrl = audioEl ? audioEl.getAttribute('src') : 'assets/audio/vogal_a_registro_grave.wav';

    function freqToX(freq, padLeft, plotW) {
      const clamped = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
      return padLeft + ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW;
    }

    function applyEqValues(gainsMap) {
      bandKeys.forEach((k) => {
        const val = gainsMap[k] !== undefined ? gainsMap[k] : 0;
        if (bandInputs[k]) {
          bandInputs[k].value = String(val);
          syncSliderVisual(bandInputs[k]);
        }
        if (bandReadouts[k]) {
          bandReadouts[k].textContent = `${val > 0 ? '+' : ''}${Number(val).toFixed(1)} dB`;
        }
        engine.setEqBandGain(k, val);
      });
      drawFftFrame();
    }

    function drawFftFrame() {
      const setup = setupCanvasHiDpi(fftCanvas);
      if (!setup) return;
      const { ctx, w, h } = setup;

      const padLeft = 34;
      const padRight = 14;
      const padTop = 14;
      const padBottom = 24;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, w, h);

      // Grade vertical nas 5 frequências do EQ
      ctx.strokeStyle = '#18181C';
      ctx.lineWidth = 1;
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#71717A';

      const labels = ['62Hz', '250Hz', '1kHz', '4kHz', '16kHz'];
      bandFreqs.forEach((f, idx) => {
        const x = Math.round(freqToX(f, padLeft, plotW)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.fillText(labels[idx], x - 14, h - 7);
      });

      // Grade horizontal dB (0 dB no centro para a curva do EQ)
      const dbLines = [
        { label: '+18', yFrac: 0.1 },
        { label: '0dB', yFrac: 0.5 },
        { label: '-18', yFrac: 0.9 }
      ];
      dbLines.forEach((dl) => {
        const y = Math.round(padTop + dl.yFrac * plotH) + 0.5;
        ctx.strokeStyle = dl.label === '0dB' ? '#27272A' : '#18181C';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
        ctx.fillText(dl.label, 4, y + 3);
      });

      // 1. Espectro FFT AO VIVO do áudio real (quando reproduzindo gravação da equipe)
      const fft = engine.getEqFftSnapshot();
      if (fft) {
        const binWidth = fft.sampleRate / fft.fftSize;
        const binCount = fft.data.length;

        ctx.beginPath();
        let started = false;
        for (let px = 0; px <= plotW; px += 2) {
          const logF = LOG_MIN + (px / plotW) * (LOG_MAX - LOG_MIN);
          const freq = Math.pow(10, logF);
          const bin = Math.min(binCount - 1, Math.max(1, Math.round(freq / binWidth)));
          const db = Math.max(-84, Math.min(-6, fft.data[bin]));
          const norm = (db + 84) / 78; // [0..1]
          const x = padLeft + px;
          const y = padTop + plotH - norm * plotH;
          if (!started) {
            ctx.moveTo(x, padTop + plotH);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(padLeft + plotW, padTop + plotH);
        ctx.closePath();

        ctx.fillStyle = 'rgba(255, 85, 0, 0.16)';
        ctx.fill();

        // Contorno do espectro real
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const logF = LOG_MIN + (px / plotW) * (LOG_MAX - LOG_MIN);
          const freq = Math.pow(10, logF);
          const bin = Math.min(binCount - 1, Math.max(1, Math.round(freq / binWidth)));
          const db = Math.max(-84, Math.min(-6, fft.data[bin]));
          const norm = (db + 84) / 78;
          const x = padLeft + px;
          const y = padTop + plotH - norm * plotH;
          if (px === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Atualiza leitores de pico proeminente em tempo real
        if (peakFreqEl) {
          peakFreqEl.textContent = `${Math.round(fft.peakFreq)} Hz (${freqToNoteName(fft.peakFreq)})`;
        }
        if (peakDbEl) {
          peakDbEl.textContent = `${fft.peakDb.toFixed(1)} dB`;
        }
      } else {
        if (peakFreqEl) peakFreqEl.textContent = '-- Hz';
        if (peakDbEl) peakDbEl.textContent = '-- dB';
      }

      // 2. Curva real de resposta em frequência combinada dos 5 BiquadFilterNode (#38BDF8)
      const curvePoints = 180;
      const freqSamples = new Float32Array(curvePoints);
      for (let i = 0; i < curvePoints; i++) {
        const logF = LOG_MIN + (i / (curvePoints - 1)) * (LOG_MAX - LOG_MIN);
        freqSamples[i] = Math.pow(10, logF);
      }

      const eqRespDb = engine.getEqFrequencyResponseDb(freqSamples);
      const midY = padTop + plotH * 0.5;
      const dbScalePx = (plotH * 0.4) / 18; // +/-18 dB mapeado no eixo

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < curvePoints; i++) {
        const x = padLeft + (i / (curvePoints - 1)) * plotW;
        const clampedDb = Math.max(-22, Math.min(22, eqRespDb[i]));
        const y = midY - clampedDb * dbScalePx;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Pontos de controle das 5 bandas sobre a curva do EQ
      const bandResp = engine.getEqFrequencyResponseDb(new Float32Array(bandFreqs));
      bandFreqs.forEach((f, idx) => {
        const x = freqToX(f, padLeft, plotW);
        const clampedDb = Math.max(-22, Math.min(22, bandResp[idx]));
        const y = midY - clampedDb * dbScalePx;
        ctx.fillStyle = '#09090B';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    function fftLoop() {
      if (!engine.eq.active) {
        rafId = null;
        return;
      }
      drawFftFrame();
      rafId = window.requestAnimationFrame(fftLoop);
    }

    function stop() {
      engine.stopEqAudio();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      setPlayButtonVisual(playBtn, false, 'Reproduzir', 'Parar');
      if (eqLed) {
        eqLed.classList.remove('led--accent', 'led--pulse');
        eqLed.classList.add('led--idle');
      }
      drawFftFrame();
    }

    async function startSelectedRecording() {
      const result = await engine.startEqAudio(currentSampleUrl, audioEl);
      if (result.ok) {
        setPlayButtonVisual(playBtn, true, 'Reproduzir', 'Parar');
        if (eqLed) {
          eqLed.classList.remove('led--idle');
          eqLed.classList.add('led--accent', 'led--pulse');
        }
        if (fileLed) {
          fileLed.classList.remove('led--idle');
          fileLed.classList.add('led--accent');
        }
        if (statusEl) {
          const durStr = result.duration ? ` (${result.duration.toFixed(1)} s)` : '';
          statusEl.textContent = `Reproduzindo áudio real${durStr}`;
        }
        rafId = window.requestAnimationFrame(fftLoop);
      } else {
        stop();
        if (statusEl) statusEl.textContent = result.reason;
      }
    }

    // Eventos dos 5 sliders do EQ
    bandKeys.forEach((k) => {
      const input = bandInputs[k];
      if (!input) return;
      input.addEventListener('input', () => {
        const db = parseFloat(input.value) || 0;
        engine.setEqBandGain(k, db);
        if (!engine.eq.active) drawFftFrame();
      });
    });

    // Botões de seleção das gravações vocais + curva característica de formantes
    document.querySelectorAll('[data-vowel-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-vowel-preset');
        const src = btn.getAttribute('data-audio-src');
        if (src) currentSampleUrl = src;
        if (vowelEqPresets[key]) {
          applyEqValues(vowelEqPresets[key]);
        }
        if (engine.eq.active) {
          startSelectedRecording();
        }
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        applyEqValues({ '62': 0, '250': 0, '1k': 0, '4k': 0, '16k': 0 });
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (engine.eq.active) {
          stop();
        } else {
          startSelectedRecording();
        }
      });
    }

    drawFftFrame();
    return { stop, redraw: drawFftFrame };
  }

  /* ========================================================================
     ABA 4B: MINI SEQUENCIADOR PIANO ROLL MIDI (FM VS. PCM + EVENT LIST)
     ======================================================================== */
  function initMidiSequencer() {
    const grid = document.getElementById('pianoRollGrid');
    const eventListBody = document.getElementById('midiEventListBody');
    const eventCountEl = document.getElementById('midiEventCount');
    const playBtn = document.getElementById('midiPlayBtn');
    const clearBtn = document.getElementById('midiClearBtn');
    const demoBtn = document.getElementById('midiDemoBtn');
    const bpmSlider = document.getElementById('midiBpmSlider');
    const fmBtn = document.getElementById('midiEngineFM');
    const pcmBtn = document.getElementById('midiEnginePCM');
    const seqLed = document.getElementById('midiSeqLed');

    if (!grid || !eventListBody) return { stop: () => {} };

    const NOTES_ORDER = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'];
    const TOTAL_STEPS = 16;

    let synthEngine = 'fm'; // 'fm' | 'pcm'
    let isPlaying = false;
    let currentStep = 0;
    let nextNoteTime = 0;
    let schedulerTimer = null;

    // Estado da matriz 8x16 sincronizado com as células do DOM
    function getActiveCells() {
      const events = [];
      const channel = synthEngine === 'fm' ? 1 : 2;

      for (let step = 0; step < TOTAL_STEPS; step++) {
        for (let row = 0; row < NOTES_ORDER.length; row++) {
          const note = NOTES_ORDER[row];
          const cell = grid.querySelector(`.pr-cell[data-note="${note}"][data-step="${step}"]`);
          if (cell && cell.classList.contains('is-active')) {
            const beat = Math.floor(step / 4) + 1;
            const subTick = (step % 4) * 120; // 480 PPQ -> 120 ticks por semicolcheia
            const tickStr = `1:${beat}:${String(subTick).padStart(3, '0')}`;
            const velocity = step % 4 === 0 ? 112 : (step % 2 === 0 ? 100 : 88);
            events.push({ trk: 1, step, tick: tickStr, chn: channel, note, velocity });
          }
        }
      }
      return events;
    }

    function renderEventList(highlightStep = -1) {
      const events = getActiveCells();
      if (eventCountEl) {
        eventCountEl.textContent = `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`;
      }

      if (!events.length) {
        eventListBody.innerHTML = '<tr><td colspan="5" class="text-xs text-muted" style="text-align:center; padding: 14px;">Clique na grade para inserir notas MIDI</td></tr>';
        return;
      }

      const frag = document.createDocumentFragment();
      events.forEach((ev) => {
        const tr = document.createElement('tr');
        if (ev.step === highlightStep) {
          tr.style.background = 'rgba(255, 85, 0, 0.14)';
        }
        tr.innerHTML = `
          <td class="num-cell">${ev.trk}</td>
          <td class="num-cell">${ev.tick}</td>
          <td class="num-cell">${ev.chn}</td>
          <td class="mono text-accent">${ev.note}</td>
          <td class="num-cell">${ev.velocity}</td>
        `;
        frag.appendChild(tr);
      });

      eventListBody.innerHTML = '';
      eventListBody.appendChild(frag);
    }

    function highlightStepColumn(stepIdx) {
      grid.querySelectorAll('.pr-cell.is-playing-col').forEach((c) => c.classList.remove('is-playing-col'));
      if (stepIdx >= 0) {
        grid.querySelectorAll(`.pr-cell[data-step="${stepIdx}"]`).forEach((c) => c.classList.add('is-playing-col'));
      }
      renderEventList(stepIdx);
    }

    function scheduleStep(stepIdx, time) {
      const bpm = parseFloat(bpmSlider ? bpmSlider.value : '120') || 120;
      const stepDur = (60 / bpm) / 4; // semicolcheia
      const velocity = stepIdx % 4 === 0 ? 112 : (stepIdx % 2 === 0 ? 100 : 88);

      NOTES_ORDER.forEach((note) => {
        const cell = grid.querySelector(`.pr-cell[data-note="${note}"][data-step="${stepIdx}"]`);
        if (cell && cell.classList.contains('is-active')) {
          engine.playMidiNote(note, synthEngine, velocity, time, stepDur * 1.45);
        }
      });

      const delayMs = Math.max(0, (time - engine.ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (isPlaying) highlightStepColumn(stepIdx);
      }, delayMs);
    }

    function schedulerTick() {
      if (!isPlaying || !engine.ctx) return;
      const bpm = parseFloat(bpmSlider ? bpmSlider.value : '120') || 120;
      const secondsPerStep = (60 / bpm) / 4;

      while (nextNoteTime < engine.ctx.currentTime + 0.1) {
        scheduleStep(currentStep, nextNoteTime);
        nextNoteTime += secondsPerStep;
        currentStep = (currentStep + 1) % TOTAL_STEPS;
      }
    }

    function start() {
      const ctx = engine.ensureContext();
      if (!ctx) return;
      isPlaying = true;
      currentStep = 0;
      nextNoteTime = ctx.currentTime + 0.04;
      setPlayButtonVisual(playBtn, true, 'Play / Stop', 'Stop');
      if (seqLed) {
        seqLed.classList.remove('led--idle');
        seqLed.classList.add('led--accent', 'led--pulse');
      }
      schedulerTimer = window.setInterval(schedulerTick, 25);
    }

    function stop() {
      isPlaying = false;
      if (schedulerTimer) {
        window.clearInterval(schedulerTimer);
        schedulerTimer = null;
      }
      setPlayButtonVisual(playBtn, false, 'Play / Stop', 'Stop');
      if (seqLed) {
        seqLed.classList.remove('led--accent', 'led--pulse');
        seqLed.classList.add('led--idle');
      }
      highlightStepColumn(-1);
    }

    // Delegação de clique nas células do Piano Roll
    grid.addEventListener('click', (event) => {
      const cell = event.target.closest('.pr-cell');
      if (!cell) return;

      const isNowActive = !cell.classList.contains('is-active');
      cell.classList.toggle('is-active', isNowActive);
      cell.setAttribute('aria-pressed', String(isNowActive));

      if (isNowActive) {
        const note = cell.dataset.note;
        const step = parseInt(cell.dataset.step, 10) || 0;
        const vel = step % 4 === 0 ? 112 : 96;
        engine.playMidiNote(note, synthEngine, vel, null, 0.24);
      }

      renderEventList(isPlaying ? currentStep : -1);
    });

    if (fmBtn) {
      fmBtn.addEventListener('click', () => {
        synthEngine = 'fm';
        renderEventList(isPlaying ? currentStep : -1);
      });
    }
    if (pcmBtn) {
      pcmBtn.addEventListener('click', () => {
        synthEngine = 'pcm';
        renderEventList(isPlaying ? currentStep : -1);
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (isPlaying) stop();
        else start();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        grid.querySelectorAll('.pr-cell.is-active').forEach((cell) => {
          cell.classList.remove('is-active');
          cell.setAttribute('aria-pressed', 'false');
        });
        renderEventList(-1);
      });
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        const demoPattern = new Set([
          'C4-0', 'E4-2', 'G4-4', 'C5-6',
          'A4-8', 'G4-10', 'E4-12', 'D4-14', 'G4-15'
        ]);
        grid.querySelectorAll('.pr-cell').forEach((cell) => {
          const key = `${cell.dataset.note}-${cell.dataset.step}`;
          const active = demoPattern.has(key);
          cell.classList.toggle('is-active', active);
          cell.setAttribute('aria-pressed', String(active));
        });
        renderEventList(-1);
      });
    }

    renderEventList(-1);
    return { stop };
  }

  /* ========================================================================
     BOOT DOS SIMULADORES & SINCRONIZAÇÃO COM TROCA DE ABAS
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    if (global.StudioApp) {
      global.StudioApp.enginesLoaded = true;
    }

    const fourierCtrl = initFourierSimulator();
    const pcmCtrl = initPcmWorkbench();
    const bitrateCtrl = initBitrateCalculator();
    const eqCtrl = initEqAndFft();
    const midiCtrl = initMidiSequencer();

    // Redesenha os canvases ao trocar de aba e pausa fontes contínuas para evitar sobreposição
    window.addEventListener('studio:tabchange', (event) => {
      const tabId = event.detail && event.detail.tabId;
      if (tabId !== 'fisica-fourier') fourierCtrl.stop();
      if (tabId !== 'pcm-digitalizacao') pcmCtrl.stop();
      if (tabId !== 'sintese-midi-voz') {
        eqCtrl.stop();
        midiCtrl.stop();
      }

      window.requestAnimationFrame(() => {
        if (tabId === 'fisica-fourier') fourierCtrl.redraw();
        if (tabId === 'pcm-digitalizacao') pcmCtrl.redraw();
        if (tabId === 'compressao-formatos') bitrateCtrl.redraw();
        if (tabId === 'sintese-midi-voz') eqCtrl.redraw();
      });
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fourierCtrl.redraw();
        pcmCtrl.redraw();
        eqCtrl.redraw();
      }, 120);
    });
  });
})(window);
