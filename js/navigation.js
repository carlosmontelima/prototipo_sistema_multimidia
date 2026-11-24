/**
 * STUDIO AUDIO WORKBENCH — Navegação Não-Linear, Modais, Balões de Formatos e Inicialização Visual
 * Sistema Multimídia Educacional: Áudio Digital, Música e Voz
 */

(function () {
  'use strict';

  const VALID_TABS = [
    'fisica-fourier',
    'pcm-digitalizacao',
    'compressao-formatos',
    'sintese-midi-voz',
    'estudio-autoral',
    'quiz-interativo'
  ];

  const SVG_CATALOG = {
    transdutor: {
      title: 'Transdutor Eletroacústico — Alto-Falante Dinâmico',
      path: 'assets/vetores/transdutor_alto_falante.svg',
      layers: 'layer-background-grid, layer-tensao-audio, layer-ima-permanente, layer-bobina-movel, layer-cone-alto-falante, layer-indicador-movimento, layer-ondas-sonoras, layer-anotacoes-tecnicas'
    },
    pcm: {
      title: 'Cadeia de Digitalização e Modulação PCM (ADC → DAC)',
      path: 'assets/vetores/cadeia_digitalizacao_pcm.svg',
      layers: 'layer-background, layer-grupo-adc, layer-sinal-analogico, layer-filtro-passa-baixas, layer-amostrador-pam, layer-quantizador, layer-codificador-binario, layer-sistema-digital, layer-dac, layer-conexoes-fluxo'
    },
    midi: {
      title: 'Topologia de Rede MIDI (16 Canais — IN / OUT / THRU)',
      path: 'assets/vetores/topologia_rede_midi.svg',
      layers: 'layer-bg-grid, layer-computador-sequenciador, layer-teclado-sintetizador, layer-modulo-sintetizador, layer-modulo-efeitos, layer-cabos-rede-midi, layer-conector-din5, layer-anotacoes'
    }
  };

  const FORMAT_CATALOG = {
    wav: {
      title: 'WAV (Waveform Audio File Format)',
      subtitle: '.wav // PCM Não Comprimido',
      description: 'Contêiner RIFF padronizado no ecossistema Windows para armazenamento de áudio digital PCM linear sem compactação. Guarda cada amostra de amplitude diretamente, tipicamente em 16 bits/amostra a 44,1 kHz (qualidade de CD: 176.400 bytes/s em estéreo), oferecendo fidelidade absoluta e baixa demanda de CPU na leitura, porém gerando arquivos volumosos.',
      compression: 'Nenhuma (PCM Bruto)',
      bitrate: '1.411,2 kbps (CD Estéreo)',
      mechanism: 'Amostragem linear PCM (sem descarte)',
      usage: 'Gravação, edição em DAW e masterização'
    },
    aiff: {
      title: 'AIFF (Audio Interchange File Format)',
      subtitle: '.aiff // PCM Não Comprimido',
      description: 'Formato de áudio digital não compactado desenvolvido pela Apple e tradicionalmente empregado em plataformas Mac e Unix. Assim como o WAV, armazena amostras PCM tipicamente em 16 bits por amostra (podendo operar com outras resoluções), com qualidade idêntica ao áudio original e suporte a metadados internos.',
      compression: 'Nenhuma (PCM Bruto)',
      bitrate: '1.411,2 kbps (CD Estéreo)',
      mechanism: 'PCM linear big-endian',
      usage: 'Produção de áudio em Mac/Unix e estúdio'
    },
    flac: {
      title: 'FLAC (Free Lossless Audio Codec)',
      subtitle: '.flac // Compressão Sem Perdas (Lossless)',
      description: 'Codec aberto de compressão sem perdas que reduz o tamanho de um arquivo WAV/PCM em cerca de 40% a 50% (média aproximada de 45%) garantindo reconstrução bit-a-bit exatamente idêntica ao sinal original. Combina predição linear entre amostras vizinhas (redundância temporal) com codificação entrópica de Rice nos resíduos (redundância estatística).',
      compression: 'Lossless (~45% menor)',
      bitrate: '~650 – 1.000 kbps (variável)',
      mechanism: 'Predição Linear (LPC) + Codificação Rice',
      usage: 'Arquivamento fiel, estúdio e streaming Hi-Res'
    },
    mp3: {
      title: 'MP3 (MPEG-1 Audio Layer 3)',
      subtitle: '.mp3 // Compressão Com Perdas (Lossy)',
      description: 'Corresponde à Camada 3 do padrão MPEG áudio (disponível desde 1993). Opera tipicamente entre 32 e 320 kbps, atingindo boa qualidade a partir de 96 kbps por canal. Utiliza banco de filtros, MDCT e um modelo psicoacústico baseado no sistema auditivo humano para descartar componentes mascarados ou inaudíveis, reduzindo drasticamente o tamanho do arquivo.',
      compression: 'Lossy (Psicoacústica)',
      bitrate: '32 – 320 kbps (padrão 128–320)',
      mechanism: 'Mascaramento psicoacústico + Huffman',
      usage: 'Distribuição digital, web e reprodutores portáteis'
    },
    mpa: {
      title: 'MPA / MP2 (MPEG Audio Camadas 1 e 2)',
      subtitle: '.mpa, .mp2 // Compressão Com Perdas (Lossy)',
      description: 'Camadas anteriores da família MPEG áudio (1991), projetadas para equilibrar complexidade de codificação e desempenho. A Camada 1 opera de 32 a 448 kbps (boa qualidade a 192 kbps/canal, usada em DCC); a Camada 2 opera de 32 a 384 kbps (boa qualidade a 256 kbps/canal, adotada em Difusão de Áudio Digital DAB, CD-I e DVD).',
      compression: 'Lossy (Sub-bandas)',
      bitrate: '32 – 448 kbps (Camada 1/2)',
      mechanism: 'Banco de filtros de sub-bandas + psicoacústica',
      usage: 'Radiodifusão digital (DAB), TV digital e DVD'
    },
    ac3: {
      title: 'AC-3 (Dolby Digital)',
      subtitle: '.ac3 // Áudio Multicanal Lossy',
      description: 'Algoritmo de codificação perceptual desenvolvido pela Dolby Laboratories (disponível desde 1991) voltado à entrega eficiente de áudio multicanal. Opera entre 32 e 640 kbps, atingindo boa qualidade a 384 kbps distribuídos em 5.1 canais discretos (cinco canais de banda larga e um canal de subgraves LFE).',
      compression: 'Lossy (Psicoacústica 5.1)',
      bitrate: '32 – 640 kbps (ref. 384 kbps)',
      mechanism: 'Transformada perceptual multicanal',
      usage: 'HDTV, TV a cabo, cinema digital e DVD'
    },
    opus: {
      title: 'Opus',
      subtitle: '.opus // Compressão Moderna Baixa Latência',
      description: 'Codec aberto padronizado pelo IETF (2012) que integra dois núcleos internos: SILK (otimizado para fala humana via predição linear) e CELT (baseado em MDCT para música em alta fidelidade). Adapta dinamicamente taxa de bits e largura de banda de 6 a 510 kbps com latência algorítmica extremamente baixa.',
      compression: 'Lossy Adaptativa',
      bitrate: '6 – 510 kbps (ótimo a 96 kbps)',
      mechanism: 'Híbrido SILK (voz) + CELT (música)',
      usage: 'WebRTC, VoIP, chamadas em tempo real e streaming'
    },
    adpcm: {
      title: 'ADPCM (Adaptive Differential PCM)',
      subtitle: 'Codec // Codificação Diferencial Adaptativa',
      description: 'Evolução direta do PCM que explora a redundância temporal (inter-amostra): em vez de armazenar o valor absoluto de cada amostra, codifica a diferença entre a amostra atual e uma previsão baseada nas amostras anteriores, ajustando dinamicamente o passo de quantização conforme a variação da amplitude.',
      compression: 'Lossy Leve (Diferencial)',
      bitrate: '16 – 64 kbps',
      mechanism: 'Redundância temporal + quantização adaptativa',
      usage: 'Telefonia digital, gravação embarcada e voz'
    },
    au: {
      title: 'AU (Sun / NeXT Audio)',
      subtitle: '.au // Compressão Logarítmica mu-law',
      description: 'Formato histórico popularizado em estações de trabalho Sun e sistemas Unix. Utiliza frequentemente quantização não-linear logarítmica (compressão mu-law), que aloca maior resolução para sinais de baixa amplitude — otimizando a relação sinal-ruído em gravações de voz com 8 bits por amostra.',
      compression: 'Companding Logarítmico (mu-law)',
      bitrate: '64 kbps típico (8 kHz, 8-bit)',
      mechanism: 'Quantização não-linear mu-law',
      usage: 'Sistemas Sun/Unix e telecomunicações clássicas'
    },
    wma: {
      title: 'WMA (Windows Media Audio)',
      subtitle: '.wma // Formato Proprietário Microsoft',
      description: 'Família de codecs proprietários criada pela Microsoft para o ecossistema Windows Media. Inclui variações com perdas baseadas em modelagem psicoacústica (concorrente direta do MP3 em taxas médias e baixas), além de perfis específicos para voz (WMA Voice) e versão sem perdas (WMA Lossless).',
      compression: 'Lossy (ou Lossless dedicado)',
      bitrate: '64 – 320 kbps típico',
      mechanism: 'Transformada perceptual proprietária',
      usage: 'Ecossistema Windows Media e streaming legado'
    },
    ra: {
      title: 'Real Audio (RA / RAM)',
      subtitle: '.ra, .ram // Streaming Proprietário',
      description: 'Formato proprietário da RealNetworks concebido especificamente para transmissão de áudio ao vivo pela Internet em conexões de baixa largura de banda. O arquivo .ra armazena o fluxo de áudio compactado, enquanto .ram atua como metadado/atalho apontando para a transmissão em rede.',
      compression: 'Lossy (Baixo Bitrate)',
      bitrate: '16 – 128 kbps',
      mechanism: 'Codificação otimizada para streaming em rede',
      usage: 'Rádios online e áudio ao vivo histórico na Web'
    },
    qt: {
      title: 'QuickTime Audio / Video (QT / MOV)',
      subtitle: '.qt, .mov // Contêiner Proprietário Apple',
      description: 'Formato de arquivo multimídia proprietário da Apple baseado na arquitetura QuickTime. Atua como contêiner estruturado em trilhas sincronizadas capazes de encapsular fluxos de áudio (PCM, AAC, MP3) e vídeo digital, amplamente adotado em fluxos de edição audiovisual profissional.',
      compression: 'Contêiner (depende do codec interno)',
      bitrate: 'Variável conforme faixa interna',
      mechanism: 'Multiplexação de trilhas de áudio e vídeo',
      usage: 'Edição de vídeo e reprodução QuickTime'
    },
    midi: {
      title: 'MIDI (Musical Instrument Digital Interface)',
      subtitle: '.mid // Representação Simbólica de Eventos',
      description: 'Diferente dos formatos de áudio digitalizado, arquivos .mid não armazenam amostras de onda sonora: gravam apenas sequências de eventos musicais (nota acionada, duração, canal entre 1 e 16, intensidade/velocity e troca de instrumento) com marcas de tempo. Por isso ocupam pouquíssimos kilobytes e permitem alterar timbres livremente, mas não reproduzem voz falada e dependem do sintetizador usado.',
      compression: 'Não aplicável (Eventos simbólicos)',
      bitrate: '~1 – 3 kbps equivalentes',
      mechanism: 'Mensagens de controle (Note On/Off, Velocity)',
      usage: 'Composição, sequenciadores, partituras e jogos'
    }
  };

  const visitedTabs = new Set();
  let activeTab = 'fisica-fourier';

  /* ========================================================================
     1. NAVEGAÇÃO NÃO-LINEAR
     ======================================================================== */
  function setActiveTab(tabId, options = { updateHash: true }) {
    if (!VALID_TABS.includes(tabId)) return;
    activeTab = tabId;
    visitedTabs.add(tabId);

    document.querySelectorAll('.nav-module-btn[data-tab]').forEach((btn) => {
      const isTarget = btn.dataset.tab === tabId;
      btn.classList.toggle('is-active', isTarget);
      btn.setAttribute('aria-selected', String(isTarget));

      const led = btn.querySelector('.nav-module-led');
      if (led) {
        led.classList.remove('led--accent', 'led--cyan', 'led--idle');
        if (isTarget) {
          led.classList.add('led--accent');
        } else if (visitedTabs.has(btn.dataset.tab)) {
          led.classList.add('led--cyan');
        } else {
          led.classList.add('led--idle');
        }
      }
    });

    document.querySelectorAll('.env-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === `panel-${tabId}`);
    });

    updateVisitedTelemetry();

    if (options.updateHash && window.location.hash !== `#${tabId}`) {
      history.replaceState(null, '', `#${tabId}`);
    }

    window.requestAnimationFrame(() => {
      renderAllStandbyScopes();
      syncAllSliderFills();
    });

    window.dispatchEvent(new CustomEvent('studio:tabchange', { detail: { tabId } }));
  }

  function updateVisitedTelemetry() {
    const counter = document.getElementById('visitedCounterText');
    if (counter) counter.textContent = `${visitedTabs.size}/${VALID_TABS.length}`;

    document.querySelectorAll('[data-visited-dot]').forEach((dot) => {
      const id = dot.getAttribute('data-visited-dot');
      dot.classList.remove('led--accent', 'led--cyan', 'led--idle');
      if (id === activeTab) {
        dot.classList.add('led--accent');
      } else if (visitedTabs.has(id)) {
        dot.classList.add('led--cyan');
      } else {
        dot.classList.add('led--idle');
      }
    });
  }

  function initNavigation() {
    document.querySelectorAll('.nav-module-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveTab(btn.dataset.tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-jump-tab');
        if (target) {
          setActiveTab(target);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    window.addEventListener('hashchange', () => {
      const hashTab = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hashTab) && hashTab !== activeTab) {
        setActiveTab(hashTab, { updateHash: false });
      }
    });

    const initialHash = window.location.hash.replace('#', '');
    setActiveTab(VALID_TABS.includes(initialHash) ? initialHash : 'fisica-fourier', {
      updateHash: false
    });
  }

  /* ========================================================================
     2. BALÕES CLICÁVEIS DE FORMATOS (OVERLAY Z-INDEX ELEVADO)
     ======================================================================== */
  function initFormatBalloons() {
    const overlay = document.getElementById('formatDetailOverlay');
    const closeBtn = document.getElementById('closeFormatDetailBtn');
    const titleEl = document.getElementById('formatDetailTitle');
    const subtitleEl = document.getElementById('formatDetailSubtitle');
    const descEl = document.getElementById('formatDetailDesc');
    const compEl = document.getElementById('formatDetailCompression');
    const rateEl = document.getElementById('formatDetailBitrate');
    const mechEl = document.getElementById('formatDetailMechanism');
    const usageEl = document.getElementById('formatDetailUsage');
    const chips = document.querySelectorAll('.format-balloon-btn[data-format-key]');

    if (!overlay || !chips.length) return { close: () => {} };

    const closeFormatOverlay = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      chips.forEach((chip) => chip.classList.remove('is-active'));
    };

    const openFormatOverlay = (key, triggerBtn) => {
      const data = FORMAT_CATALOG[key];
      if (!data) return;

      chips.forEach((chip) => chip.classList.toggle('is-active', chip === triggerBtn));
      if (titleEl) titleEl.textContent = data.title;
      if (subtitleEl) subtitleEl.textContent = data.subtitle;
      if (descEl) descEl.textContent = data.description;
      if (compEl) compEl.textContent = data.compression;
      if (rateEl) rateEl.textContent = data.bitrate;
      if (mechEl) mechEl.textContent = data.mechanism;
      if (usageEl) usageEl.textContent = data.usage;

      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        openFormatOverlay(chip.getAttribute('data-format-key'), chip);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeFormatOverlay);
    }

    // Fecha ao clicar fora da caixa (no backdrop)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeFormatOverlay();
    });

    return { close: closeFormatOverlay };
  }

  /* ========================================================================
     3. MODAIS (EQUIPE & SOBRE + INSPETOR SVG)
     ======================================================================== */
  function setupModal(modalEl, openTriggers, closeBtn) {
    if (!modalEl) return { open: () => {}, close: () => {} };

    const open = () => {
      modalEl.classList.add('is-open');
      modalEl.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    const close = () => {
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    openTriggers.forEach((btn) => btn && btn.addEventListener('click', open));
    if (closeBtn) closeBtn.addEventListener('click', close);

    modalEl.addEventListener('click', (event) => {
      if (event.target === modalEl) close();
    });

    return { open, close };
  }

  function initModals(formatOverlayCtrl) {
    const teamCtrl = setupModal(
      document.getElementById('teamModal'),
      [document.getElementById('openTeamModalBtn')],
      document.getElementById('closeTeamModalBtn')
    );

    const svgModal = document.getElementById('svgInspectModal');
    const svgTitle = document.getElementById('svgInspectTitle');
    const svgPath = document.getElementById('svgInspectPath');
    const svgImg = document.getElementById('svgInspectImg');
    const svgLayers = document.getElementById('svgInspectLayers');
    const svgLayersCell = svgLayers ? svgLayers.closest('.lcd-cell') : null;
    const svgCtrl = setupModal(svgModal, [], document.getElementById('closeSvgInspectBtn'));

    const openMediaPreview = ({ title, path, src, layers }) => {
      if (svgTitle) svgTitle.textContent = title;
      if (svgPath) svgPath.textContent = path;
      if (svgImg) {
        svgImg.src = src;
        svgImg.alt = title;
      }
      if (svgLayers && svgLayersCell) {
        if (layers) {
          svgLayers.textContent = layers;
          svgLayersCell.hidden = false;
        } else {
          svgLayers.textContent = '';
          svgLayersCell.hidden = true;
        }
      }
      svgCtrl.open();
    };

    document.querySelectorAll('[data-svg-inspect]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = SVG_CATALOG[btn.getAttribute('data-svg-inspect')];
        if (!item) return;
        openMediaPreview({
          title: item.title,
          path: item.path,
          src: item.path,
          layers: item.layers
        });
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        teamCtrl.close();
        svgCtrl.close();
        if (formatOverlayCtrl) formatOverlayCtrl.close();
      }
    });

    return { openMediaPreview };
  }

  /* ========================================================================
     4. PREENCHIMENTO ATIVO (#FF5500) DOS FADERS DE HARDWARE
     ======================================================================== */
  function updateSliderFill(input) {
    if (!input) return;
    const min = parseFloat(input.min || '0');
    const max = parseFloat(input.max || '100');
    const val = parseFloat(input.value || '0');
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
  }

  function syncAllSliderFills() {
    document.querySelectorAll('input[type="range"].studio-fader').forEach(updateSliderFill);
  }

  function initSliderHardwareFill() {
    document.querySelectorAll('input[type="range"].studio-fader').forEach((input) => {
      updateSliderFill(input);
      input.addEventListener('input', () => updateSliderFill(input));
    });
  }

  /* ========================================================================
     5. OSCILOSCÓPIOS EM MODO VISUAL INICIAL (OBSIDIAN + #FF5500 + #38BDF8)
     ======================================================================== */
  function drawScopeGrid(canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width > 0 ? rect.width : canvas.width;
    const cssHeight = rect.height > 0 ? rect.height : canvas.height;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = cssWidth;
    const h = cssHeight;

    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, w, h);

    // Grade neutra discreta
    ctx.strokeStyle = '#18181C';
    ctx.lineWidth = 1;
    const cols = opts.cols || 10;
    const rows = opts.rows || 6;

    ctx.beginPath();
    for (let i = 1; i < cols; i++) {
      const x = Math.round((w / cols) * i) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let j = 1; j < rows; j++) {
      const y = Math.round((h / rows) * j) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (opts.centerAxis !== false) {
      const midY = Math.round(h / 2) + 0.5;
      ctx.strokeStyle = '#27272A';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (opts.preview === 'sine') {
      ctx.strokeStyle = opts.color || '#FF5500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x / w) * Math.PI * 4;
        const y = h / 2 - Math.sin(t) * (h * 0.34);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (opts.preview === 'pcm') {
      // Curva analógica em azul técnico (#38BDF8)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x / w) * Math.PI * 3;
        const y = h / 2 - Math.sin(t) * (h * 0.34);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Degraus quantizados em laranja hardware (#FF5500)
      const steps = 18;
      const stepW = w / steps;
      ctx.strokeStyle = '#FF5500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s < steps; s++) {
        const sampleX = (s + 0.5) * stepW;
        const raw = Math.sin((sampleX / w) * Math.PI * 3);
        const quant = Math.round(raw * 3.5) / 3.5;
        const y = h / 2 - quant * (h * 0.34);
        if (s === 0) ctx.moveTo(s * stepW, y);
        else ctx.lineTo(s * stepW, y);
        ctx.lineTo((s + 1) * stepW, y);
      }
      ctx.stroke();
    } else if (opts.preview === 'error') {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const saw = (((x / 34) % 1) - 0.5) * (h * 0.44);
        const y = h / 2 + saw;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (opts.preview === 'fft') {
      const bars = 30;
      const barW = Math.max(4, (w - 32) / bars - 4);
      for (let i = 0; i < bars; i++) {
        const norm = i / bars;
        const envelope = Math.exp(-norm * 2.3) * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.4)));
        const barH = Math.max(6, envelope * (h * 0.74));
        const x = 16 + i * ((w - 32) / bars);
        ctx.fillStyle = i < 10 ? '#FF5500' : 'rgba(56, 189, 248, 0.72)';
        ctx.fillRect(x, h - 14 - barH, barW, barH);
      }
    } else if (opts.preview === 'lissajous') {
      ctx.strokeStyle = '#FF5500';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const t = (i / 360) * Math.PI * 2;
        const x = w / 2 + Math.sin(3 * t + Math.PI / 4) * (w * 0.32);
        const y = h / 2 + Math.sin(2 * t) * (h * 0.36);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function renderAllStandbyScopes() {
    const enginesLoaded = Boolean(window.StudioApp && window.StudioApp.enginesLoaded);
    const studioLoaded = Boolean(window.StudioApp && window.StudioApp.studioLoaded);

    if (!enginesLoaded) {
      drawScopeGrid(document.getElementById('fourierCanvas'), { preview: 'sine', color: '#FF5500' });
      drawScopeGrid(document.getElementById('pcmSignalCanvas'), { preview: 'pcm' });
      drawScopeGrid(document.getElementById('pcmErrorCanvas'), { preview: 'error', rows: 4 });
      drawScopeGrid(document.getElementById('fftCanvas'), { preview: 'fft', centerAxis: false });
    }
    if (!studioLoaded) {
      drawScopeGrid(document.getElementById('abWaveformCanvas'), { preview: 'sine', color: '#38BDF8', rows: 4 });
    }
  }

  /* ========================================================================
     6. GRADE PIANO ROLL, SELETOR DE AMOSTRAS DO EQ, SEGMENTED E MÍDIAS
     ======================================================================== */
  function initPianoRollSkeleton() {
    const grid = document.getElementById('pianoRollGrid');
    if (!grid || grid.dataset.initialized === 'true') return;

    const notes = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'];
    const initialDemo = new Set(['C4-0', 'E4-4', 'G4-8', 'C5-12']);

    const fragment = document.createDocumentFragment();
    notes.forEach((note) => {
      const keyLabel = document.createElement('div');
      keyLabel.className = 'pr-key-label';
      keyLabel.textContent = note;
      fragment.appendChild(keyLabel);

      for (let step = 0; step < 16; step++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'pr-cell';
        cell.dataset.note = note;
        cell.dataset.step = String(step);
        if (step % 4 === 0) cell.dataset.beatStart = 'true';
        const isPreset = initialDemo.has(`${note}-${step}`);
        if (isPreset) cell.classList.add('is-active');
        cell.setAttribute('aria-pressed', String(isPreset));
        cell.setAttribute('aria-label', `Nota ${note}, passo ${step + 1}`);
        fragment.appendChild(cell);
      }
    });

    grid.appendChild(fragment);
    grid.dataset.initialized = 'true';
  }

  function initEqSampleSelector() {
    const audioEl = document.getElementById('eqAudioSource');
    const pathEl = document.getElementById('eqAudioFilePath');
    const statusEl = document.getElementById('eqAudioStatus');
    const ledEl = document.getElementById('eqAudioFileLed');
    const sampleButtons = document.querySelectorAll('[data-vowel-preset][data-audio-src]');
    if (!audioEl || !sampleButtons.length) return;

    const setAudioReadyState = (ready, durationSec) => {
      if (ledEl) {
        ledEl.classList.remove('led--accent', 'led--idle');
        ledEl.classList.add(ready ? 'led--accent' : 'led--idle');
      }
      if (statusEl) {
        statusEl.textContent = ready
          ? `Áudio pronto (${durationSec.toFixed(1)} s)`
          : 'Aguardando gravação (ver TODO_MIDIAS.md)';
      }
    };

    audioEl.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        setAudioReadyState(true, audioEl.duration);
      }
    });

    audioEl.addEventListener('error', () => {
      setAudioReadyState(false, 0);
    });

    sampleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const src = btn.getAttribute('data-audio-src');
        sampleButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-selected', active);
          b.setAttribute('aria-pressed', String(active));
        });
        if (src) {
          if (pathEl) pathEl.textContent = src;
          setAudioReadyState(false, 0);
          audioEl.src = src;
          audioEl.load();
        }
      });
    });
  }

  function initSegmentedControls() {
    document.querySelectorAll('.segmented-control').forEach((group) => {
      const buttons = group.querySelectorAll('.segmented-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => {
            const selected = b === btn;
            b.classList.toggle('is-selected', selected);
            b.setAttribute('aria-checked', String(selected));
          });

          if (group.id === 'abSwitchGroup') {
            const isTreated = btn.dataset.abMode === 'treated';
            const modeLed = document.getElementById('abModeLed');
            const label = document.getElementById('abActiveTrackLabel');
            if (modeLed) {
              modeLed.classList.toggle('led--accent', isTreated);
              modeLed.classList.toggle('led--cyan', !isTreated);
            }
            if (label) {
              label.textContent = isTreated
                ? 'Monitorando: B — Áudio Tratado (Limpeza + EQ + Norm.)'
                : 'Monitorando: A — Áudio Bruto';
            }
          }
        });
      });
    });
  }

  function initMediaAvailabilityHooks(openMediaPreview) {
    // Imagens matriciais distribuídas ao longo de todo o aplicativo
    document.querySelectorAll('[data-raster-figure]').forEach((figure) => {
      const img = figure.querySelector('.studio-figure-img');
      const placeholder = figure.querySelector('.studio-figure-placeholder');
      if (!img || !placeholder) return;

      const revealImage = () => {
        if (img.naturalWidth > 0) {
          img.hidden = false;
          placeholder.hidden = true;
        }
      };

      img.addEventListener('load', revealImage);
      img.addEventListener('error', () => {
        img.hidden = true;
        placeholder.hidden = false;
      });

      if (img.complete && img.naturalWidth > 0) {
        revealImage();
      }

      if (openMediaPreview) {
        img.addEventListener('click', () => {
          if (img.hidden) return;
          openMediaPreview({
            title: figure.getAttribute('data-figure-title') || img.alt || 'Imagem Matricial',
            path: img.getAttribute('src') || '',
            src: img.src,
            layers: ''
          });
        });
      }
    });

    const video = document.getElementById('studioDemoVideo');
    const videoLed = document.getElementById('videoStatusLed');
    const videoBadge = document.getElementById('videoStatusBadge');
    if (video && videoLed && videoBadge) {
      video.addEventListener('loadedmetadata', () => {
        videoLed.classList.remove('led--idle');
        videoLed.classList.add('led--accent');
        videoBadge.textContent = `Vídeo carregado (${video.videoWidth}x${video.videoHeight})`;
      });
    }
  }

  function initVisualReadoutMirrors() {
    ['62', '250', '1k', '4k', '16k'].forEach((band) => {
      const input = document.getElementById(`eqBand${band}`);
      const out = document.getElementById(`eqVal${band}`);
      if (input && out) {
        input.addEventListener('input', () => {
          const val = parseFloat(input.value);
          out.textContent = `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`;
        });
      }
    });

    const bpmInput = document.getElementById('midiBpmSlider');
    const bpmOut = document.getElementById('midiBpmVal');
    if (bpmInput && bpmOut) {
      bpmInput.addEventListener('input', () => {
        bpmOut.textContent = `${bpmInput.value} BPM`;
      });
    }
  }

  /* ========================================================================
     7. STATUS DO MOTOR WEB AUDIO & API PÚBLICA
     ======================================================================== */
  function setAudioEngineStatus(state, label) {
    const container = document.getElementById('audioEngineStatus');
    const led = document.getElementById('audioEngineLed');
    const text = document.getElementById('audioEngineText');
    if (!container || !led || !text) return;

    container.dataset.state = state;
    led.classList.remove('led--accent', 'led--idle', 'led--red', 'led--pulse');

    if (state === 'active') {
      led.classList.add('led--accent', 'led--pulse');
      text.textContent = label || 'Ativo';
    } else if (state === 'error') {
      led.classList.add('led--red');
      text.textContent = label || 'Erro';
    } else {
      led.classList.add('led--idle');
      text.textContent = label || 'Inativo';
    }
  }

  window.StudioApp = {
    enginesLoaded: false,
    setActiveTab,
    setAudioEngineStatus,
    drawScopeGrid,
    updateSliderFill,
    syncAllSliderFills,
    getActiveTab: () => activeTab
  };

  /* ========================================================================
     BOOT
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initPianoRollSkeleton();
    const formatOverlayCtrl = initFormatBalloons();
    initNavigation();
    const { openMediaPreview } = initModals(formatOverlayCtrl);
    initSliderHardwareFill();
    initEqSampleSelector();
    initSegmentedControls();
    initMediaAvailabilityHooks(openMediaPreview);
    initVisualReadoutMirrors();
    renderAllStandbyScopes();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(renderAllStandbyScopes, 140);
    });
  });
})();
