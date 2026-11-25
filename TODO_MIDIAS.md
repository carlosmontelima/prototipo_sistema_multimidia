# TODO de Mídias Autorais e Entrega — Protótipo Sistemas Multimídia

Este checklist lista **todos os arquivos originais que a equipe precisa produzir**, **em qual pasta salvá-los** dentro de `prototipo-audio-digital/` e **onde cada arquivo já está integrado no aplicativo** (`index.html`).

> Nota: As 6 mídias obrigatórias do trabalho (imagens matriciais, imagens vetoriais, áudio digitalizado, música MIDI, vídeo e animação) estão distribuídas de forma orgânica ao longo de todas as bancadas do aplicativo. Assim que a equipe salvar cada arquivo no caminho exato abaixo, a interface detecta e exibe a mídia automaticamente.

---

## 1. Estrutura Já Criada no Projeto

- [x] `index.html` — Layout split-pane não-linear dos 6 ambientes, favicon em Pixel Art, balões descritivos de formatos e integração distribuída das mídias.
- [x] `css/styles.css` — Design system Minimalist Studio Workbench (`#09090B`, `#111114`, `#FF5500`, `#38BDF8`).
- [x] `js/navigation.js` — Navegação não-linear, overlay de formatos, modais, seletor de amostras do equalizador e carregamento automático das mídias externas.
- [x] `js/audio-engine.js` — Motor Web Audio API nativo (Fourier, Bitcrusher/Downsampler PCM, EQ 5 bandas `BiquadFilterNode`, `AnalyserNode` FFT e síntese MIDI FM/PCM).
- [x] `js/simulators.js` — Simuladores interativos em Canvas 60fps, animação do transdutor SVG, bancada PCM com hover, calculadora de bitrate, EQ/FFT e Piano Roll MIDI.
- [x] `js/studio-media.js` — Comparador A/B sincronizado em tempo real e player nativo `.mid` offline.
- [x] `js/quiz-engine.js` — Motor do Quiz Interativo com embaralhamento Fisher-Yates (5 sorteadas de 25), feedback imediato e análise percentual.
- [x] `data/quiz-questions.json` — Banco com 25 questões prontas (SM_05, SM_06 e FLAC).
- [x] `assets/vetores/transdutor_alto_falante.svg` — Vetorial com camadas `<g>` (usado em **Física & Fourier**).
- [x] `assets/vetores/cadeia_digitalizacao_pcm.svg` — Vetorial com camadas `<g>` (usado em **Digitalização & PCM**).
- [x] `assets/vetores/topologia_rede_midi.svg` — Vetorial com camadas `<g>` (usado em **Síntese, MIDI & Voz**).

---

## 2. TODO — Áudio Digitalizado (Gravações da Equipe)

- **Ferramentas sugeridas (proposta):** Reaper DAW ou Audacity.
- **Pasta no projeto:** `prototipo-audio-digital/assets/audio/`

### A. Amostras Vocais para o Equalizador de 5 Bandas & Analisador FFT
- **Onde aparece no sistema:** Aba **Síntese, MIDI & Voz** → módulo `#eqFftModule` (`<audio id="eqAudioSource">`, botões `#presetVowelALow`, `#presetVowelAHigh` e `#presetVowelULow`).

- [x] **`assets/audio/vogal_a_registro_grave.wav`**
  - **O que gravar:** Emissão sustentada (~3 a 5 segundos) da vogal `"a"` em **registro vocal grave** (fundamental baixa, harmônicos próximos).
  - **Formato recomendado:** WAV PCM, 44.1 kHz, 16-bit.
- [x] **`assets/audio/vogal_a_registro_agudo.wav`**
  - **O que gravar:** Emissão sustentada (~3 a 5 segundos) da vogal `"a"` em **registro vocal agudo** (fundamental alta, maior espaçamento entre harmônicos no espectro FFT).
  - **Formato recomendado:** WAV PCM, 44.1 kHz, 16-bit.
- [x] **`assets/audio/vogal_u_registro_grave.wav`**
  - **O que gravar:** Emissão sustentada (~3 a 5 segundos) da vogal `"u"` em **registro vocal grave** (energia concentrada abaixo de 800 Hz com forte queda nas frequências altas).
  - **Formato recomendado:** WAV PCM, 44.1 kHz, 16-bit.

### B. Faixas do Comparador A/B (Tratamento de Áudio: Bruto vs. Tratado)
- **Onde aparece no sistema:** Aba **Estúdio de Tratamento** → módulo `#mediaAudioAB` (`<audio id="audioRawSource">` e `<audio id="audioTreatedSource">`).

- [ ] **`assets/audio/voz_bruta_original.wav`**
  - **O que gravar:** Narração/locução original da equipe **sem nenhum tratamento** (áudio bruto direto do microfone, com ruído ambiente natural).
- [ ] **`assets/audio/voz_tratada_master.wav`**
  - **O que produzir:** Mesma gravação de voz após o fluxo de tratamento na DAW (redução de ruído, filtro passa-altas ~80 Hz, equalização, compressão dinâmica e normalização a `-1 dB`), mantendo **exatamente a mesma duração** para sincronismo na alternância A/B.
- [ ] *(Opcional para demonstração comparativa)* **`assets/audio/voz_tratada_master.flac`**
  - **O que produzir:** Exportação da faixa tratada em `.flac` para demonstrar ao vivo a compressão sem perdas em relação ao `.wav`.

---

## 3. TODO — Imagens Matriciais (Distribuídas em Todo o Aplicativo)

- **Ferramentas sugeridas (proposta):** Câmera/smartphone, capturas de tela da DAW (Reaper/Audacity/LMMS) e acabamento no Photoshop ou Krita.
- **Pasta no projeto:** `prototipo-audio-digital/assets/imagens/`
- **Nota:** Todas as figuras abaixo têm detecção automática no `navigation.js` e ampliação ao clicar.

- [x] **`assets/imagens/fisica_transdutores.png`**
  - **Onde aparece:** Aba **Física & Fourier** → Inspetor lateral (`Registro Fotográfico — Transdutores`).
  - **Conteúdo:** Foto original produzida pela equipe mostrando microfone (captação acústico-elétrica) e caixa de som/monitor ou fone de referência (reprodução elétrico-acústica).
- [x] **`assets/imagens/pcm_amostragem_daw.png`**
  - **Onde aparece:** Aba **Digitalização & PCM** → Inspetor lateral (`Amostras Discretas na DAW`).
  - **Conteúdo:** Captura de tela em zoom máximo na DAW (Audacity/Reaper) evidenciando os pontos individuais de amostra de uma onda sonora digitalizada.
- [x] **`assets/imagens/compressao_espectrograma.png`**
  - **Onde aparece:** Aba **Compressão & Formatos** → Inspetor lateral (`Espectrograma: PCM/FLAC vs. Lossy`).
  - **Conteúdo:** Captura de espectrograma mostrando preservação do espectro completo em WAV/FLAC comparada ao corte de altas frequências em formato lossy (ex.: MP3 96/128 kbps).
- [x] **`assets/imagens/midi_sequenciador_daw.png`**
  - **Onde aparece:** Aba **Síntese, MIDI & Voz** → Inspetor lateral (`Sequenciador MIDI na Prática`).
  - **Conteúdo:** Captura de tela do sequenciador MIDI (LMMS/MuseScore/Reaper) exibindo o piano roll/trilhas da composição autoral ou foto de teclado/controlador MIDI.
- [x] **`assets/imagens/estudio_bancada.png`**
  - **Onde aparece:** Aba **Estúdio de Tratamento** → Inspetor lateral (`#mediaStudioPhoto` — `Bancada de Produção`).
  - **Conteúdo:** Fotografia do ambiente/setup de gravação e edição utilizado pela equipe na produção do protótipo.
- [ ] **`assets/imagens/poster_video.png`**
  - **Onde aparece:** Aba **Estúdio de Tratamento** → capa (`poster`) do player `<video id="studioDemoVideo">`.
  - **Conteúdo:** Imagem `16:9` de pré-visualização do vídeo demonstrativo.

---

## 4. TODO — Música MIDI Original (`.mid`)

- **Ferramentas sugeridas (proposta):** LMMS, MuseScore ou Piano Roll MIDI Editor.
- **Pasta no projeto:** `prototipo-audio-digital/assets/midi/`
- **Onde aparece no sistema:** Aba **Síntese, MIDI & Voz** → Inspetor lateral, abaixo da imagem do sequenciador (`#mediaMidiPlayer` / `#studioMidiFilePath`).

- [x] **`assets/midi/composicao_autoral.mid`**
  - **O que produzir:** Composição musical original criada pela equipe em formato Standard MIDI File (`.mid`), de preferência com mais de uma trilha/canal (ex.: melodia + acompanhamento).
- [x] Guardar também o projeto fonte (`.mscz` ou `.mmpz`) na pasta de entrega do Drive para abrir durante a apresentação.

---

## 5. TODO — Vídeo Digital

- **Ferramentas sugeridas (proposta):** OBS Studio + câmera de smartphone; edição em Sony Vegas ou Adobe Premiere.
- **Pasta no projeto:** `prototipo-audio-digital/assets/video/`
- **Onde aparece no sistema:** Aba **Estúdio de Tratamento** → módulo `#mediaVideoPlayer` (`<video id="studioDemoVideo">`).

- [ ] **`assets/video/demonstracao_tratamento.mp4`**
  - **O que produzir:** Vídeo demonstrativo (sugestão: 30 s a 90 s) apresentando a captura e edição das mídias do projeto (ex.: tratamento de áudio na DAW / composição MIDI).
  - **Especificação recomendada:** Contêiner `.mp4`, vídeo `H.264`, áudio `AAC 44.1/48 kHz`, `1280x720` (720p).
- [ ] Guardar o trecho bruto (não editado) do vídeo para entrega no Drive conforme instruções do professor.

---

## 6. Mapa Completo de Pastas

```text
prototipo-audio-digital/
├── index.html
├── TODO_MIDIAS.md
├── css/
│   └── styles.css
├── js/
│   └── navigation.js
├── data/
│   └── quiz-questions.json
└── assets/
    ├── vetores/                             [PRONTO]
    │   ├── transdutor_alto_falante.svg
    │   ├── cadeia_digitalizacao_pcm.svg
    │   └── topologia_rede_midi.svg
    ├── audio/                               [CRIAR PASTA E ADICIONAR]
    │   ├── vogal_a_registro_grave.wav
    │   ├── vogal_a_registro_agudo.wav
    │   ├── vogal_u_registro_grave.wav
    │   ├── voz_bruta_original.wav
    │   ├── voz_tratada_master.wav
    │   └── voz_tratada_master.flac          (opcional)
    ├── imagens/                             [CRIAR PASTA E ADICIONAR]
    │   ├── fisica_transdutores.png
    │   ├── pcm_amostragem_daw.png
    │   ├── compressao_espectrograma.png
    │   ├── midi_sequenciador_daw.png
    │   ├── estudio_bancada.png
    │   └── poster_video.png
    ├── midi/                                [CRIAR PASTA E ADICIONAR]
    │   └── composicao_autoral.mid
    └── video/                               [CRIAR PASTA E ADICIONAR]
        └── demonstracao_tratamento.mp4
```

---

## 7. Checklist de Entrega no Drive (Instruções da Disciplina)

- [ ] Entregar todo o material **editado** e **não editado** (bruto) para avaliação.
- [ ] Elaborar o **Relatório Técnico em PDF** (proposta revisada, problemas encontrados, técnicas, equipamentos, softwares, código-fonte e exemplos).
- [x] Preparar a apresentação em **PowerPoint (`.pptx`)** com resumo do relatório (máximo 15 minutos, participação de todos os integrantes).
- [ ] Enviar relatório técnico e slides **separados no Drive virtual SEM compactar**.
