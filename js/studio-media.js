/**
 * STUDIO AUDIO WORKBENCH — Fase 3: Controladores do Estúdio Autoral (js/studio-media.js)
 *
 * Recursos:
 * - Comparador A/B sincronizado em tempo real (Áudio Bruto vs. Áudio Tratado) + forma de onda em Canvas
 * - Leitor binário nativo de Standard MIDI File (.mid) reproduzido via StudioAudioEngine (100% offline)
 * - Palco de Animação Procedural a 60fps em HTML5 Canvas (Lissajous, Onda Estacionária e Barras Espectrais)
 */

(function (global) {
  'use strict';

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
    let phase = 0;

    // Decodificação opcional via Web Audio (em HTTP) para exibir forma de onda exata das amostras
    const bufferStore = { raw: null, treated: null };

    function tryDecodeWaveform(key, url) {
      const eng = global.studioAudioEngine;
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((ab) => {
          const ctx = eng ? eng.ensureContext() : new (window.AudioContext || window.webkitAudioContext)();
          return ctx.decodeAudioData(ab);
        })
        .then((audioBuf) => {
          bufferStore[key] = audioBuf;
          if (fileStatus) fileStatus.textContent = 'Faixas prontas para comparação A/B';
          drawWaveform();
        })
        .catch(() => {
          // Permanece usando <audio> nativo sem erro no console
        });
    }

    rawAudio.addEventListener('loadedmetadata', () => {
      if (fileStatus) fileStatus.textContent = 'Áudio bruto detectado';
      updateTimeReadout();
      tryDecodeWaveform('raw', rawAudio.getAttribute('src'));
    });

    treatedAudio.addEventListener('loadedmetadata', () => {
      if (fileStatus) fileStatus.textContent = 'Faixas A/B detectadas';
      updateTimeReadout();
      tryDecodeWaveform('treated', treatedAudio.getAttribute('src'));
    });

    function getActiveAudio() {
      return mode === 'treated' ? treatedAudio : rawAudio;
    }

    function getInactiveAudio() {
      return mode === 'treated' ? rawAudio : treatedAudio;
    }

    function updateTimeReadout() {
      const active = getActiveAudio();
      const cur = active.currentTime || 0;
      const dur = Number.isFinite(active.duration) ? active.duration : 0;
      if (timeDisplay) timeDisplay.textContent = `${formatClock(cur)} / ${formatClock(dur)}`;
    }

    function drawWaveform() {
      const setup = setupCanvasHiDpi(canvas);
      if (!setup) return;
      const { ctx, w, h } = setup;
      const midY = h / 2;

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
      ctx.stroke();

      ctx.strokeStyle = '#27272A';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(midY) + 0.5);
      ctx.lineTo(w, Math.round(midY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const activeColor = mode === 'treated' ? '#FF5500' : '#38BDF8';
      const activeAudio = getActiveAudio();
      const decoded = bufferStore[mode];

      if (decoded) {
        const chData = decoded.getChannelData(0);
        const totalSamples = chData.length;
        const step = Math.max(1, Math.floor(totalSamples / w));

        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const start = x * step;
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step && start + j < totalSamples; j++) {
            const v = chData[start + j];
            if (v < min) min = v;
            if (v > max) max = v;
          }
          ctx.moveTo(x + 0.5, midY + min * (h * 0.42));
          ctx.lineTo(x + 0.5, midY + max * (h * 0.42));
        }
        ctx.stroke();

        // Cursor de reprodução sincronizado
        if (decoded.duration > 0) {
          const playheadX = Math.min(w, (activeAudio.currentTime / decoded.duration) * w);
          ctx.strokeStyle = '#F4F4F5';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(playheadX, 0);
          ctx.lineTo(playheadX, h);
          ctx.stroke();
        }
      } else {
        // Traço ilustrativo diferenciado para A (com ruído de piso simulado) vs. B (limpo e normalizado)
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const t = (x / w) * Math.PI * 6 + phase;
          const env = 0.45 + 0.4 * Math.sin((x / w) * Math.PI * 2 + phase * 0.35);
          let yVal = Math.sin(t) * env;
          if (mode === 'raw') {
            const noise = 0.14 * Math.sin(t * 9.7 + 1.3) + 0.08 * Math.cos(t * 15.1);
            yVal = yVal * 0.68 + noise;
          } else {
            yVal = yVal * 0.88;
          }
          const y = midY - yVal * (h * 0.4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function loop() {
      if (!isPlaying) {
        rafId = null;
        return;
      }
      phase += 0.09;
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
        } catch (_) {
          updateUiPlaying(false);
          if (fileStatus) fileStatus.textContent = 'Arquivo ausente em assets/audio/ (ver TODO_MIDIAS.md)';
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
          fileStatus.textContent = 'Adicione voz_bruta_original.wav e voz_tratada_master.wav (TODO_MIDIAS.md)';
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
      updateTimeReadout();
      drawWaveform();
    }

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

    function stop() {
      isPlaying = false;
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
      playBtn.classList.remove('is-playing');
      playBtn.textContent = 'Reproduzir';
      if (ledEl) {
        ledEl.classList.remove('led--accent', 'led--pulse');
        ledEl.classList.add('led--idle');
      }
      if (progressEl) progressEl.style.width = '0%';
      if (statusEl && parsedMidi) {
        statusEl.textContent = `MIDI pronto (${parsedMidi.notes.length} notas)`;
      }
    }

    async function start() {
      const eng = global.studioAudioEngine;
      if (!eng) return;
      const ctx = eng.ensureContext();
      if (!ctx) return;

      if (!parsedMidi) {
        try {
          const res = await fetch(midiUrl);
          if (!res.ok) throw new Error('404');
          const ab = await res.arrayBuffer();
          parsedMidi = parseStandardMidiFile(ab);
        } catch (_) {
          if (statusEl) statusEl.textContent = 'Adicione composicao_autoral.mid (TODO_MIDIAS.md)';
          return;
        }
      }

      if (!parsedMidi.notes.length) {
        if (statusEl) statusEl.textContent = 'Arquivo .mid sem notas detectadas';
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

        while (nextIdx < parsedMidi.notes.length && parsedMidi.notes[nextIdx].time <= elapsed + 0.12) {
          const n = parsedMidi.notes[nextIdx++];
          if (n.channel === 9) continue; // ignora canal de percussão GM se houver
          const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
          const mode = n.channel % 2 === 0 ? 'pcm' : 'fm';
          eng.playMidiNote(freq, mode, n.velocity, startCtxTime + n.time, n.duration);
        }

        const pct = parsedMidi.totalDuration > 0
          ? Math.min(100, Math.max(0, (elapsed / parsedMidi.totalDuration) * 100))
          : 0;
        if (progressEl) progressEl.style.width = `${pct.toFixed(1)}%`;
        if (statusEl) {
          statusEl.textContent = `${formatClock(Math.max(0, elapsed))} / ${formatClock(parsedMidi.totalDuration)}`;
        }

        if (elapsed > parsedMidi.totalDuration + 0.3) {
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
        midiPlayerCtrl.stop();
      } else {
        window.requestAnimationFrame(() => {
          abCtrl.redraw();
        });
      }
    });

    window.addEventListener('resize', () => {
      if (global.StudioApp && global.StudioApp.getActiveTab() === 'estudio-autoral') {
        abCtrl.redraw();
      }
    });
  });
})(window);
