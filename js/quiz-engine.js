/**
 * STUDIO AUDIO WORKBENCH — Fase 3: Motor do Quiz Interativo (js/quiz-engine.js)
 *
 * Recursos:
 * - Banco completo com 25 questões técnicas rigorosas cobrindo Física do Som, Transdutores,
 *   Síntese Aditiva/Fourier, Filtragem da Voz, Teorema de Nyquist, Cálculo de Ta, Quantização (q = u^v),
 *   Ruído de Quantização, Peso de Áudio CD vs. Voz, Redundâncias de Compressão, WAV vs. FLAC vs. MP3,
 *   Domínio do Tempo vs. Frequência, Síntese FM vs. PCM, Rede MIDI (IN/OUT/THRU, 16 canais) e Voz.
 * - Algoritmo de embaralhamento Fisher-Yates imparcial para sortear 5 perguntas sem repetição
 *   a cada tentativa (e embaralhar também a ordem das 4 alternativas).
 * - Carregamento de data/quiz-questions.json com fallback offline integrado (funciona em http:// e file://).
 * - Feedback técnico imediato por questão, salto não-linear de revisão e relatório percentual final.
 */

(function (global) {
  'use strict';

  const QUESTIONS_PER_ROUND = 5;
  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  const TAB_LABELS = {
    'fisica-fourier': 'Física & Fourier',
    'pcm-digitalizacao': 'Digitalização & PCM',
    'compressao-formatos': 'Compressão & Formatos',
    'sintese-midi-voz': 'Síntese, MIDI & Voz',
    'estudio-autoral': 'Estúdio de Tratamento'
  };

  // Banco completo integrado (espelhando data/quiz-questions.json para funcionamento 100% offline mesmo via file://)
  const EMBEDDED_QUESTION_BANK = [
    {
      id: 'q01',
      category: 'Física do Som & Fourier',
      difficulty: 'basico',
      question: 'Como as vibrações sonoras se propagam fisicamente no ar e qual componente converte o sinal elétrico de volta em onda acústica?',
      options: [
        'Propagam-se como ondas eletromagnéticas transversais; a conversão elétrico-acústica é feita por microfones.',
        'Propagam-se como ondas de pressão atmosférica; a conversão de sinal elétrico para acústico é feita por alto-falantes.',
        'Propagam-se como pulsos digitais discretos; a conversão é feita exclusivamente por conversores ADC.',
        'Propagam-se como ondas magnéticas estacionárias; a conversão de elétrico para acústico é feita por amplificadores.'
      ],
      correctIndex: 1,
      explanation: 'O som propaga-se como ondas mecânicas longitudinais de pressão atmosférica (compressão e rarefação). Microfones são transdutores acústico-elétricos, enquanto alto-falantes atuam como transdutores elétrico-acústicos.',
      referenceTab: 'fisica-fourier'
    },
    {
      id: 'q02',
      category: 'Física do Som & Fourier',
      difficulty: 'basico',
      question: 'Qual é a relação física entre a potência transportada por uma vibração sonora e a sua amplitude?',
      options: [
        'A potência é diretamente proporcional à raiz quadrada da amplitude.',
        'A potência é inversamente proporcional à amplitude.',
        'A potência é proporcional ao quadrado da amplitude das vibrações (P ∝ A²).',
        'A potência depende apenas da frequência fundamental e independe da amplitude.'
      ],
      correctIndex: 2,
      explanation: 'Na física acústica, a energia e a potência transportadas por uma onda sonora crescem proporcionalmente ao quadrado da amplitude das vibrações (P ∝ A²): dobrar a amplitude quadruplica a potência.',
      referenceTab: 'fisica-fourier'
    },
    {
      id: 'q03',
      category: 'Física do Som & Fourier',
      difficulty: 'intermediario',
      question: 'Segundo a Análise de Fourier e o princípio da Síntese Aditiva, como qualquer forma de onda sonora periódica complexa pode ser representada?',
      options: [
        'Como um conjunto de pulsos retangulares de mesma frequência e fase fixa.',
        'Como a soma (combinação linear) de ondas senoidais puras com diferentes frequências, amplitudes e fases.',
        'Exclusivamente como ruído branco filtrado por um conversor digital-analógico.',
        'Como uma sequência simbólica de mensagens MIDI de canal único.'
      ],
      correctIndex: 1,
      explanation: 'A onda senoidal é a forma sonora mais elementar (tom puro). Pelo Teorema de Fourier, qualquer onda complexa periódica decompõe-se em senoides harmônicas; somar senoides para construir timbres complexos constitui a Síntese Aditiva.',
      referenceTab: 'fisica-fourier'
    },
    {
      id: 'q04',
      category: 'Física do Som & Fourier',
      difficulty: 'basico',
      question: 'Qual é a vulnerabilidade estrutural da representação puramente analógica do som (sinais elétricos e gravação magnética)?',
      options: [
        'Impossibilidade física de conduzir frequências superiores a 3.400 Hz.',
        'Obrigatoriedade de quantização em exatamente 8 bits por amostra.',
        'Contaminação cumulativa por ruído em todas as etapas de transformação, cópia e transmissão.',
        'Incompatibilidade elétrica com transdutores dinâmicos de bobina móvel.'
      ],
      correctIndex: 2,
      explanation: 'Na cadeia analógica, cada amplificação, cópia magnética ou transmissão soma ruído térmico e eletromagnético irreversível ao sinal original, ao contrário de sistemas digitais que regeneram símbolos binários.',
      referenceTab: 'fisica-fourier'
    },
    {
      id: 'q05',
      category: 'Física do Som & Fourier',
      difficulty: 'intermediario',
      question: 'Em um transdutor de alto-falante dinâmico, qual interação física produz o movimento axial do cone para irradiar ondas sonoras?',
      options: [
        'A corrente alternada da tensão de áudio percorre a bobina móvel imersa no campo do ímã permanente (N/S), gerando força eletromagnética axial.',
        'O ímã permanente gira em alta rotação proporcionalmente à taxa de bits.',
        'A bobina móvel atua como conversor ADC discretizando a pressão atmosférica.',
        'O cone expande-se termicamente pela passagem direta do fluxo binário PCM.'
      ],
      correctIndex: 0,
      explanation: 'Pela força de Lorentz, a corrente elétrica variável (tensão de áudio) na bobina móvel interage com o campo magnético radial fixo do ímã permanente, empurrando e puxando o cone acoplado.',
      referenceTab: 'fisica-fourier'
    },
    {
      id: 'q06',
      category: 'Digitalização & PCM',
      difficulty: 'basico',
      question: 'Qual é a sequência exata das quatro etapas realizadas na modulação PCM durante a conversão analógico-digital (ADC)?',
      options: [
        'Quantização → Filtragem → Codificação → Amostragem.',
        'Filtragem passa-baixas → Amostragem (PAM) → Quantização → Codificação binária.',
        'Amostragem → Codificação → Filtragem → Reconstrução DAC.',
        'Compressão psicoacústica → Quantização → Filtragem → Amostragem.'
      ],
      correctIndex: 1,
      explanation: 'O conversor PCM primeiro limita a banda máxima com um filtro passa-baixas (anti-aliasing), depois amostra o sinal no tempo (PAM), aproxima cada pulso para níveis discretos (quantização) e gera palavras binárias (codificação).',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q07',
      category: 'Digitalização & PCM',
      difficulty: 'intermediario',
      question: 'Na digitalização telefônica de voz em sistemas PCM, qual faixa de frequências é preservada pelo filtro passa-baixas inicial e qual nível de inteligibilidade ela garante?',
      options: [
        '20 Hz a 20.000 Hz, garantindo 100% da inteligibilidade.',
        '300 Hz a 3.400 Hz, garantindo cerca de 85% da inteligibilidade do sinal vocal.',
        '50 Hz a 1.000 Hz, garantindo 50% da inteligibilidade.',
        '4.000 Hz a 8.000 Hz, removendo as frequências fundamentais da fala.'
      ],
      correctIndex: 1,
      explanation: 'A faixa de interesse de 300 Hz a 3.400 Hz preserva cerca de 85% da inteligibilidade da voz humana, suavizando o sinal e permitindo fixar a frequência máxima em 3.400 Hz antes de amostrar a 8.000 Hz.',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q08',
      category: 'Digitalização & PCM',
      difficulty: 'basico',
      question: 'O que determina o Teorema da Amostragem (Critério de Nyquist) para evitar a distorção por aliasing na reconstrução do sinal?',
      options: [
        'A frequência de amostragem Fa deve ser inferior à frequência máxima Fmax.',
        'A frequência de amostragem Fa deve ser igual à metade de Fmax.',
        'A frequência de amostragem Fa deve ser maior ou igual ao dobro da maior frequência presente no sinal (Fa ≥ 2 · Fmax).',
        'O número de bits por amostra deve ser o dobro da frequência máxima.'
      ],
      correctIndex: 2,
      explanation: 'Pelo Critério de Nyquist, Fa ≥ 2 · Fmax. Quando Fa < 2 · Fmax, ocorre sobreposição espectral (aliasing), gerando frequências falsas mais graves impossíveis de separar na reconstrução DAC.',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q09',
      category: 'Digitalização & PCM',
      difficulty: 'intermediario',
      question: 'Sabendo que a telefonia digital PCM adota frequência de amostragem Fa = 8.000 Hz, qual é o intervalo de tempo Ta entre duas amostras consecutivas?',
      options: [
        'Ta = 125 microssegundos (125 µs).',
        'Ta = 8 milissegundos (8 ms).',
        'Ta = 22,67 microssegundos (22,67 µs).',
        'Ta = 125 milissegundos (125 ms).'
      ],
      correctIndex: 0,
      explanation: 'O período de amostragem é o inverso da taxa de amostragem: Ta = 1 / Fa = 1 / 8.000 s = 0,000125 s = 125 µs.',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q10',
      category: 'Digitalização & PCM',
      difficulty: 'intermediario',
      question: 'O número de níveis discretos de um quantizador é dado por q = μ^v. Em um codificador binário (μ = 2) com v = 3 bits/amostra, quantos níveis existem e qual código representa o nível 6?',
      options: [
        '6 níveis; código 101.',
        '8 níveis (0 a 7); o nível 6 corresponde ao código binário 110.',
        '9 níveis (0 a 8); o nível 6 corresponde ao código binário 011.',
        '16 níveis; o nível 6 corresponde ao código binário 0110.'
      ],
      correctIndex: 1,
      explanation: 'Para μ = 2 e v = 3, temos q = 2³ = 8 níveis (000₂ = 0 até 111₂ = 7). Uma amostra Xs = 6,2 é aproximada para Xsq = 6, codificada em 3 bits como 110.',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q11',
      category: 'Digitalização & PCM',
      difficulty: 'avancado',
      question: 'A respeito da imunidade a ruído e do ruído de quantização em sistemas PCM, assinale a proposição correta:',
      options: [
        'O ruído de quantização surge apenas quando há interferência eletromagnética nos cabos digitais.',
        'Sistemas PCM são praticamente imunes a ruídos de regeneração física, mas o arredondamento das amplitudes PAM para níveis discretos introduz erro de quantização (limitado a ±q/2).',
        'Diminuir a resolução de 16 bits para 3 bits reduz o erro de quantização pela metade.',
        'O ruído de quantização é eliminado reduzindo a taxa de amostragem abaixo do limite de Nyquist.'
      ],
      correctIndex: 1,
      explanation: 'Embora os pulsos binários possam ser regenerados sem acumular ruído de linha, aproximar valores contínuos infinitos em q níveis discretos introduz o erro εᵢ = Xs − Xsq, ouvido como ruído de fundo na saída do DAC.',
      referenceTab: 'pcm-digitalizacao'
    },
    {
      id: 'q12',
      category: 'Compressão & Formatos',
      difficulty: 'intermediario',
      question: 'Qual é o consumo exato em bytes de 1 segundo de música estereofônica com qualidade de CD Áudio (44.100 Hz, 16 bits por amostra, 2 canais) sem compressão?',
      options: [
        '8.000 bytes/s.',
        '44.100 bytes/s.',
        '88.200 bytes/s.',
        '176.400 bytes/s (equivalente a 1.411,2 kbps no total, ou 705,6 kbps por canal).'
      ],
      correctIndex: 3,
      explanation: 'Com 16 bits = 2 bytes por amostra, 44.100 amostras/s e 2 canais (estéreo): 2 × 44.100 × 2 = 176.400 bytes/s. Em bits: 176.400 × 8 = 1.411.200 bps = 1.411,2 kbps.',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q13',
      category: 'Compressão & Formatos',
      difficulty: 'basico',
      question: 'Compare o peso de 1 segundo de voz telefônica PCM (8 kHz, 8-bit, mono) com 1 segundo de CD Áudio estéreo (44,1 kHz, 16-bit):',
      options: [
        'Voz PCM ocupa 8.000 bytes/s (64 kbps), sendo exatamente 22,05 vezes menor que o CD estéreo (176.400 bytes/s).',
        'Ambos ocupam 64 kbps porque utilizam modulação PCM linear.',
        'Voz PCM ocupa 64.000 bytes/s, enquanto o CD estéreo ocupa 88.200 bytes/s.',
        'Voz PCM ocupa 1.000 bytes/s (8 kbps) sem nenhuma compressão.'
      ],
      correctIndex: 0,
      explanation: 'Na telefonia PCM: Rs = 8.000 × 8 = 64 kbps = 8.000 bytes/s. No CD estéreo: 176.400 bytes/s. A razão é 176.400 / 8.000 = 22,05 vezes.',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q14',
      category: 'Compressão & Formatos',
      difficulty: 'intermediario',
      question: 'Quais são os quatro princípios fundamentais explorados pelos algoritmos de compressão de áudio digital?',
      options: [
        'Amostragem PAM, Quantização Uniforme, Dithering e Normalização.',
        'Redundância Estatística, Redundância Temporal (inter-amostra), Redundância do Conhecimento e Propriedades do Sistema Humano de Audição (Psicoacústica).',
        'Modulação em Frequência, Multiplexação MIDI, Filtragem Passa-Altas e Reverberação.',
        'Apenas truncamento de bits menos significativos e redução para canal mono.'
      ],
      correctIndex: 1,
      explanation: 'Codecs combinam codificação entrópica (estatística), correlação entre amostras vizinhas (temporal), modelos compartilhados como trato vocal (conhecimento) e mascaramento perceptivo (psicoacústica).',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q15',
      category: 'Compressão & Formatos',
      difficulty: 'intermediario',
      question: 'Como o codec FLAC (Free Lossless Audio Codec) reduz o tamanho de um arquivo PCM em cerca de 45% sem perder nenhum bit de informação?',
      options: [
        'Descartando frequências acima de 15 kHz por mascaramento psicoacústico.',
        'Convertendo a forma de onda em mensagens simbólicas de notas MIDI.',
        'Combinando predição linear inter-amostra (LPC — redundância temporal) com codificação entrópica de Rice nos resíduos (redundância estatística).',
        'Reduzindo a resolução de 16 bits para 8 bits com compressão logarítmica mu-law.'
      ],
      correctIndex: 2,
      explanation: 'O FLAC modela o sinal por predição linear (LPC) e codifica apenas o erro residual exato usando códigos de Rice, restaurando 100% das amostras originais bit a bit na decodificação.',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q16',
      category: 'Compressão & Formatos',
      difficulty: 'avancado',
      question: 'Assinale a comparação tecnicamente exata entre os formatos WAV, FLAC e MP3 (MPEG Camada 3):',
      options: [
        'WAV é comprimido sem perdas; FLAC e MP3 são formatos com perdas irreversíveis.',
        'WAV armazena PCM descomprimido; FLAC aplica compressão lossless (reconstrução bit-a-bit idêntica ao WAV); MP3 aplica compressão lossy psicoacústica para atingir taxas reduzidas (ex.: 96 a 320 kbps).',
        'FLAC e WAV possuem exatamente o mesmo bitrate fixo de 1.411,2 kbps.',
        'MP3 preserva 100% do espectro até 22,05 kHz mesmo em 96 kbps, sem descartar dados.'
      ],
      correctIndex: 1,
      explanation: 'WAV mantém os dados PCM brutos; FLAC reduz o espaço em ~45% sem qualquer perda; MP3 sacrifica irreversivelmente componentes mascarados pelo ouvido humano em troca de alta taxa de compactação.',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q17',
      category: 'Compressão & Formatos',
      difficulty: 'intermediario',
      question: 'Entre os algoritmos clássicos de áudio digital, qual opera entre 32 e 640 kbps, oferecendo boa qualidade multicanal (5.1 canais) a 384 kbps em HDTV, Cabo e DVD?',
      options: [
        'ADPCM.',
        'AC-3 Dolby Digital.',
        'AU (Sun mu-law).',
        'MPEG Camada 1 (DCC).'
      ],
      correctIndex: 1,
      explanation: 'O algoritmo AC-3 Dolby (1991) foi concebido para áudio multicanal 5.1 discreto com débito de 32 a 640 kbps (referência típica de 384 kbps em DVD e TV digital).',
      referenceTab: 'compressao-formatos'
    },
    {
      id: 'q18',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'basico',
      question: 'Qual distinção define corretamente operações no domínio do tempo versus operações no domínio da frequência no processamento digital de som?',
      options: [
        'Domínio do tempo atua sobre amostras separadas (cortar, copiar, atenuar, mixar); domínio da frequência analisa sequências de amostras via FFT (filtragem espectral, síntese, pitch/time e reconhecimento de voz).',
        'Domínio do tempo exige Transformada de Fourier; domínio da frequência altera apenas o volume global.',
        'Domínio do tempo aplica-se somente à voz; domínio da frequência aplica-se somente a arquivos MIDI.',
        'Ambos operam exclusivamente sobre uma única amostra isolada sem memória de amostras vizinhas.'
      ],
      correctIndex: 0,
      explanation: 'Operações temporais manipulam amplitudes amostra a amostra; operações frequenciais exigem janelas/sequências de amostras para extrair e modificar o conteúdo espectral.',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q19',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'intermediario',
      question: 'Na comparação entre técnicas de síntese musical em tempo real (Síntese FM vs. Síntese PCM), quais atributos caracterizam corretamente cada abordagem?',
      options: [
        'FM: boa imitação acústica e controle inflexível. PCM: imitação acústica fraca e custo baixo.',
        'FM: não fundamentada em propriedades físicas, imitação acústica fraca, baixo custo e controle flexível de timbres. PCM: baseada em ondas gravadas reais, boa imitação acústica, custo médio e controle de timbres inflexível.',
        'FM exige grandes memórias SoundFont; PCM dispensa armazenamento de amostras.',
        'Ambas reproduzem voz falada a partir de arquivos .mid sem necessidade de sintetizador.'
      ],
      correctIndex: 1,
      explanation: 'A Síntese FM gera espectros ricos com poucos osciladores (baixo custo e alta flexibilidade timbrística, porém baixa fidelidade acústica). A Síntese PCM reproduz gravações reais (ótima imitação acústica, custo médio de memória e menor maleabilidade).',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q20',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'basico',
      question: 'Qual é o papel dos amostradores ("samplers") e dos bancos SoundFont na síntese musical digital?',
      options: [
        'Limitar a banda telefônica a 3.400 Hz antes do conversor ADC.',
        'Armazenar formas de onda gravadas de instrumentos reais em memórias de amostras / fontes de som para reprodução controlada por eventos musicais.',
        'Substituir os cabos DIN de 5 pinos por transmissões analógicas.',
        'Compactar arquivos MP3 utilizando redundância psicoacústica.'
      ],
      correctIndex: 1,
      explanation: 'Samplers implementam a síntese PCM: organizam gravações digitais de instrumentos reais (com pontos de loop e envelopes) em bancos/fontes de som acionados em tempo real.',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q21',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'intermediario',
      question: 'Em uma rede MIDI padrão, quantos canais independentes são suportados por porta e qual é a função exata do conector MIDI THRU?',
      options: [
        '8 canais por porta; a porta THRU converte eventos MIDI em sinal analógico para caixas de som.',
        '16 canais simultâneos por porta; a porta THRU retransmite uma cópia exata das mensagens recebidas na porta IN para encadear outros módulos em série.',
        '32 canais por porta; a porta THRU envia apenas os eventos gerados localmente pelo próprio teclado.',
        '1 canal mono por porta; a porta THRU serve apenas para alimentação elétrica.'
      ],
      correctIndex: 1,
      explanation: 'Cada barramento MIDI suporta 16 canais (permitindo até 16 timbres independentes simultâneos). A porta OUT transmite eventos criados pelo próprio aparelho, enquanto THRU replica o que entra em IN (daisy-chain).',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q22',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'basico',
      question: 'Por que um arquivo MIDI (.mid) é ordens de grandeza menor que um arquivo WAV e qual limitação decorre diretamente dessa arquitetura?',
      options: [
        'Porque usa taxa de amostragem de 1 kHz; sua limitação é não permitir alterar o andamento (BPM).',
        'Porque armazena apenas instruções simbólicas de eventos musicais (nota, canal, velocity, tick) e não áudio amostrado; por isso é inadequado para voz falada e sua sonoridade depende do sintetizador.',
        'Porque descarta todos os harmônicos pares; sua limitação é exigir 6 canais de áudio.',
        'Porque grava apenas 1 bit por amostra; sua limitação é alto custo computacional.'
      ],
      correctIndex: 1,
      explanation: 'O arquivo .mid funciona como uma partitura digital de eventos: ocupa poucos kilobytes e permite trocar instrumentos livremente, mas não contém forma de onda gravada (inadequado para locução/efeitos acústicos).',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q23',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'intermediario',
      question: 'Quais são as quatro vistas clássicas de edição disponibilizadas por softwares sequenciadores MIDI?',
      options: [
        'Osciloscópio, Espectrograma, Vetorscópio e Medidor LUFS.',
        'Trilhas (Tracks), Rolo de Pianola (Piano Roll), Lista de Eventos (Event List) e Pauta Musical (Partitura).',
        'Amostrador, Quantizador, Codificador e Decodificador.',
        'Entrada IN, Saída OUT, Repasse THRU e Conector DIN.'
      ],
      correctIndex: 1,
      explanation: 'Sequenciadores exibem e editam mensagens MIDI sob quatro representações: visão geral de trilhas, grade temporal Piano Roll, tabela numérica Event List (Trk, Tick, Chn, Nota, Velocity) e notação em pauta.',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q24',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'avancado',
      question: 'Ao analisar via FFT os espectros das vogais sustentadas "a" (registro grave), "a" (registro agudo) e "u" (registro grave), o que diferencia esses três perfis espectrais?',
      options: [
        'A vogal "u" concentra energia nas baixas frequências (abaixo de ~800 Hz, pico ~172 Hz), enquanto "a" estende harmônicos intensos até ~3 kHz — com maior espaçamento entre harmônicos no registro agudo.',
        'A vogal "u" apresenta energia plana até 16 kHz, e o registro agudo possui harmônicos mais próximos entre si que o registro grave.',
        'Todas as vogais humanas apresentam exatamente o mesmo espectro FFT, mudando apenas a fase.',
        'O registro agudo possui frequência fundamental f0 menor que o registro grave.'
      ],
      correctIndex: 0,
      explanation: 'Os formantes do trato vocal moldam o espectro: "u" atenua fortemente frequências médias/altas acima de 800–1.000 Hz, já "a" excita formantes médios intensos; em registros agudos (f0 maior), as raias harmônicas (n · f0) ficam mais espaçadas.',
      referenceTab: 'sintese-midi-voz'
    },
    {
      id: 'q25',
      category: 'Processamento, Síntese, MIDI & Voz',
      difficulty: 'intermediario',
      question: 'No processamento computacional da fala, quais são os pipelines da síntese e do reconhecimento de voz e qual fenômeno dificulta a síntese natural?',
      options: [
        'Síntese: áudio → fonemas → texto. Reconhecimento: texto → áudio. Dificuldade: aliasing MIDI.',
        'Síntese: texto → fonemas → áudio (dificultada pela coarticulação entre fonemas vizinhos e dependência de idioma). Reconhecimento: áudio → fonemas → palavras → comandos.',
        'Síntese: MIDI → partitura → WAV. Reconhecimento: WAV → MP3. Dificuldade: excesso de canais THRU.',
        'Ambos convertem diretamente letras ASCII em senoides puras de frequência fixa sem análise fonética.'
      ],
      correctIndex: 1,
      explanation: 'A síntese converte texto em fonemas e sinal acústico (sofrendo com a coarticulação — influência mútua entre fonemas adjacentes — e prosódia/inflexões), enquanto o reconhecimento extrai fonemas, palavras e comandos a partir do áudio.',
      referenceTab: 'sintese-midi-voz'
    }
  ];

  /**
   * Embaralhamento imparcial de Fisher-Yates (complexidade O(n), sem mutar o array original)
   */
  function fisherYatesShuffle(sourceArray) {
    const arr = sourceArray.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  /**
   * Feedback sonoro sutil via Web Audio API (apenas se o contexto já estiver ativo/desbloqueado)
   */
  function playFeedbackChime(isCorrect) {
    const eng = global.studioAudioEngine;
    if (!eng || !eng.ctx || eng.ctx.state !== 'running' || !eng.masterGain) return;

    const ctx = eng.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (isCorrect) {
      osc.frequency.setValueAtTime(523.25, now);        // C5
      osc.frequency.setValueAtTime(659.25, now + 0.065); // E5
    } else {
      osc.frequency.setValueAtTime(246.94, now);        // B3
      osc.frequency.setValueAtTime(207.65, now + 0.08); // G#3
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    osc.connect(gain);
    gain.connect(eng.masterGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  function initQuizEngine() {
    const startScreen = document.getElementById('quizStartScreen');
    const activeScreen = document.getElementById('quizActiveScreen');
    const resultScreen = document.getElementById('quizResultScreen');

    const bankCountEl = document.getElementById('quizBankCount');
    const startBtn = document.getElementById('quizStartBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const restartBtn = document.getElementById('quizRestartBtn');

    const categoryTag = document.getElementById('quizCategoryTag');
    const progressText = document.getElementById('quizProgressText');
    const progressBar = document.getElementById('quizProgressBar');
    const progressFill = document.getElementById('quizProgressFill');
    const questionText = document.getElementById('quizQuestionText');
    const optionsContainer = document.getElementById('quizOptionsContainer');

    const feedbackBox = document.getElementById('quizFeedbackBox');
    const feedbackTitle = document.getElementById('quizFeedbackTitle');
    const feedbackText = document.getElementById('quizFeedbackText');
    const refJumpBtn = document.getElementById('quizReferenceJumpBtn');
    const statusNote = document.getElementById('quizStatusNote');

    const scorePercentEl = document.getElementById('quizScorePercent');
    const scoreFractionEl = document.getElementById('quizScoreFraction');
    const perfBadgeEl = document.getElementById('quizPerformanceBadge');
    const resultHeadlineEl = document.getElementById('quizResultHeadline');
    const resultSummaryEl = document.getElementById('quizResultSummary');
    const reviewListEl = document.getElementById('quizReviewList');

    if (!startScreen || !activeScreen || !resultScreen || !startBtn) return;

    let fullBank = EMBEDDED_QUESTION_BANK.slice();
    let currentRound = [];
    let currentIndex = 0;
    let answeredCurrent = false;
    let userHistory = [];

    // Tenta sincronizar com data/quiz-questions.json se estiver em servidor HTTP; mantém fallback offline caso contrário
    fetch('data/quiz-questions.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.questions) && json.questions.length >= QUESTIONS_PER_ROUND) {
          fullBank = json.questions;
          if (bankCountEl) bankCountEl.textContent = `${fullBank.length} questões`;
        }
      })
      .catch(() => {
        // Permanece com EMBEDDED_QUESTION_BANK sem erros no console (ex.: protocolo file://)
      });

    if (bankCountEl) bankCountEl.textContent = `${fullBank.length} questões`;

    function showScreen(target) {
      [startScreen, activeScreen, resultScreen].forEach((scr) => {
        scr.classList.toggle('is-visible', scr === target);
      });
    }

    function prepareRoundQuestions() {
      const shuffledQuestions = fisherYatesShuffle(fullBank).slice(0, QUESTIONS_PER_ROUND);

      // Embaralha também as 4 alternativas de cada questão preservando o índice da correta
      return shuffledQuestions.map((q) => {
        const indexedOptions = q.options.map((text, idx) => ({
          text,
          isCorrect: idx === q.correctIndex
        }));
        const shuffledOpts = fisherYatesShuffle(indexedOptions);
        return {
          id: q.id,
          category: q.category,
          difficulty: q.difficulty,
          question: q.question,
          options: shuffledOpts.map((o) => o.text),
          correctIndex: shuffledOpts.findIndex((o) => o.isCorrect),
          explanation: q.explanation,
          referenceTab: q.referenceTab
        };
      });
    }

    function startNewRound() {
      currentRound = prepareRoundQuestions();
      currentIndex = 0;
      userHistory = [];
      showScreen(activeScreen);
      renderCurrentQuestion();
    }

    function renderCurrentQuestion() {
      const q = currentRound[currentIndex];
      if (!q) return;

      answeredCurrent = false;
      const stepNum = currentIndex + 1;
      const pct = Math.round((stepNum / QUESTIONS_PER_ROUND) * 100);

      if (categoryTag) categoryTag.textContent = q.category;
      if (progressText) {
        progressText.textContent = `${String(stepNum).padStart(2, '0')} / ${String(QUESTIONS_PER_ROUND).padStart(2, '0')}`;
      }
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
      if (progressFill) progressFill.style.width = `${pct}%`;

      if (questionText) questionText.textContent = q.question;

      // Oculta feedback anterior e bloqueia avanço até responder
      if (feedbackBox) {
        feedbackBox.hidden = true;
        feedbackBox.classList.remove('is-reveal');
      }
      if (refJumpBtn) refJumpBtn.hidden = true;
      if (statusNote) statusNote.textContent = 'Selecione uma alternativa (ou teclas A–D)';
      if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = stepNum === QUESTIONS_PER_ROUND ? 'Ver Resultado Final' : 'Próxima Questão';
      }

      // Renderiza botões das alternativas com animação escalonada
      optionsContainer.innerHTML = '';
      const frag = document.createDocumentFragment();

      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option-btn quiz-option-enter';
        btn.style.animationDelay = `${idx * 40}ms`;
        btn.dataset.optIndex = String(idx);

        const keySpan = document.createElement('span');
        keySpan.className = 'quiz-option-key';
        keySpan.textContent = OPTION_LETTERS[idx] || String(idx + 1);

        const labelSpan = document.createElement('span');
        labelSpan.textContent = optText;

        btn.appendChild(keySpan);
        btn.appendChild(labelSpan);
        btn.addEventListener('click', () => handleAnswerSelection(idx));
        frag.appendChild(btn);
      });

      optionsContainer.appendChild(frag);
    }

    function handleAnswerSelection(chosenIdx) {
      if (answeredCurrent) return;
      answeredCurrent = true;

      const q = currentRound[currentIndex];
      const isCorrect = chosenIdx === q.correctIndex;

      userHistory.push({
        question: q,
        chosenIdx,
        isCorrect
      });

      const optionBtns = optionsContainer.querySelectorAll('.quiz-option-btn');
      optionBtns.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('is-correct');
        } else if (idx === chosenIdx && !isCorrect) {
          btn.classList.add('is-wrong');
        }
      });

      playFeedbackChime(isCorrect);

      if (feedbackTitle) {
        feedbackTitle.textContent = isCorrect
          ? 'Resposta correta'
          : `Resposta incorreta — Alternativa correta: ${OPTION_LETTERS[q.correctIndex]}`;
        feedbackTitle.style.color = isCorrect ? 'var(--status-ok)' : 'var(--alert-red)';
      }

      if (feedbackText) feedbackText.textContent = q.explanation;

      if (refJumpBtn && q.referenceTab) {
        const tabLabel = TAB_LABELS[q.referenceTab] || 'Bancada';
        refJumpBtn.textContent = `Explorar em ${tabLabel}`;
        refJumpBtn.onclick = () => {
          if (global.StudioApp && typeof global.StudioApp.setActiveTab === 'function') {
            global.StudioApp.setActiveTab(q.referenceTab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        };
        refJumpBtn.hidden = false;
      }

      if (feedbackBox) {
        feedbackBox.hidden = false;
        feedbackBox.classList.add('is-reveal');
      }

      if (statusNote) {
        statusNote.textContent = currentIndex + 1 === QUESTIONS_PER_ROUND
          ? 'Rodada concluída — clique para ver seu desempenho'
          : 'Resposta registrada — avance para a próxima questão';
      }

      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.focus();
      }
    }

    function animateScoreCounter(targetPercent) {
      if (!scorePercentEl) return;
      const durationMs = 520;
      const startTs = performance.now();

      const tick = (now) => {
        const elapsed = Math.min(1, (now - startTs) / durationMs);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        const val = Math.round(targetPercent * eased);
        scorePercentEl.textContent = `${val}%`;
        if (elapsed < 1) {
          window.requestAnimationFrame(tick);
        }
      };

      window.requestAnimationFrame(tick);
    }

    function renderFinalResults() {
      showScreen(resultScreen);

      const hits = userHistory.filter((item) => item.isCorrect).length;
      const total = userHistory.length || QUESTIONS_PER_ROUND;
      const percent = Math.round((hits / total) * 100);

      animateScoreCounter(percent);
      if (scoreFractionEl) {
        scoreFractionEl.textContent = `${hits} / ${total} ${hits === 1 ? 'acerto' : 'acertos'}`;
      }

      // Análise diagnóstica de desempenho
      let badgeText = 'Revisão Recomendada';
      let headline = 'Continue praticando nas bancadas interativas';
      let summary = 'Explore os simuladores dos tópicos destacados abaixo e sorteie uma nova rodada para consolidar os conceitos.';

      if (percent === 100) {
        badgeText = 'Domínio Excelente';
        headline = 'Aproveitamento máximo nos fundamentos de Áudio Digital';
        summary = 'Você acertou todas as 5 questões sorteadas. Experimente gerar um novo sorteio para testar outras perguntas do banco de 25 itens.';
      } else if (percent >= 80) {
        badgeText = 'Ótimo Desempenho';
        headline = 'Sólido domínio técnico sobre os módulos avaliados';
        summary = 'Excelente resultado. Confira abaixo o detalhamento pontual e sorteie uma nova bateria quando desejar.';
      } else if (percent >= 60) {
        badgeText = 'Bom Desempenho';
        headline = 'Boa base conceitual com pontos específicos de ajuste';
        summary = 'Revise as justificativas técnicas das questões erradas abaixo e utilize os atalhos diretos para os simuladores.';
      }

      if (perfBadgeEl) perfBadgeEl.textContent = badgeText;
      if (resultHeadlineEl) resultHeadlineEl.textContent = headline;
      if (resultSummaryEl) resultSummaryEl.textContent = summary;

      // Lista de revisão completa das 5 questões sorteadas
      if (reviewListEl) {
        reviewListEl.innerHTML = '';
        const frag = document.createDocumentFragment();

        userHistory.forEach((entry, idx) => {
          const card = document.createElement('div');
          card.className = 'lcd-cell quiz-review-item';
          card.style.padding = '12px 14px';
          card.style.gap = '6px';
          card.style.borderLeft = entry.isCorrect
            ? '3px solid var(--status-ok)'
            : '3px solid var(--alert-red)';

          const topRow = document.createElement('div');
          topRow.className = 'row-between';

          const statusTag = document.createElement('span');
          statusTag.className = 'mono text-xs';
          statusTag.style.color = entry.isCorrect ? 'var(--status-ok)' : 'var(--alert-red)';
          statusTag.textContent = `Q0${idx + 1} · ${entry.isCorrect ? 'ACERTO' : 'ERRO'} · ${entry.question.category}`;
          topRow.appendChild(statusTag);

          if (entry.question.referenceTab) {
            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.className = 'btn btn--ghost btn--xs';
            jumpBtn.textContent = `Abrir ${TAB_LABELS[entry.question.referenceTab] || 'Bancada'}`;
            jumpBtn.addEventListener('click', () => {
              if (global.StudioApp && typeof global.StudioApp.setActiveTab === 'function') {
                global.StudioApp.setActiveTab(entry.question.referenceTab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            });
            topRow.appendChild(jumpBtn);
          }

          const qTitle = document.createElement('div');
          qTitle.className = 'text-sm text-primary';
          qTitle.style.fontWeight = '600';
          qTitle.textContent = entry.question.question;

          const ansInfo = document.createElement('div');
          ansInfo.className = 'text-xs text-secondary';
          const chosenText = entry.question.options[entry.chosenIdx];
          const rightText = entry.question.options[entry.question.correctIndex];
          ansInfo.textContent = entry.isCorrect
            ? `Sua resposta: (${OPTION_LETTERS[entry.chosenIdx]}) ${chosenText}`
            : `Sua resposta: (${OPTION_LETTERS[entry.chosenIdx]}) ${chosenText}  |  Correta: (${OPTION_LETTERS[entry.question.correctIndex]}) ${rightText}`;

          const expInfo = document.createElement('div');
          expInfo.className = 'text-xs text-muted';
          expInfo.textContent = entry.question.explanation;

          card.appendChild(topRow);
          card.appendChild(qTitle);
          card.appendChild(ansInfo);
          card.appendChild(expInfo);
          frag.appendChild(card);
        });

        reviewListEl.appendChild(frag);
      }
    }

    startBtn.addEventListener('click', startNewRound);

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!answeredCurrent) return;
        if (currentIndex + 1 < currentRound.length) {
          currentIndex++;
          renderCurrentQuestion();
        } else {
          renderFinalResults();
        }
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', startNewRound);
    }

    // Atalhos de teclado (A-D / 1-4 e Enter) quando a aba do Quiz está ativa
    document.addEventListener('keydown', (event) => {
      if (!global.StudioApp || global.StudioApp.getActiveTab() !== 'quiz-interativo') return;
      if (!activeScreen.classList.contains('is-visible')) return;
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

      const key = event.key.toUpperCase();
      if (!answeredCurrent) {
        const keyMap = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
        if (keyMap[key] !== undefined) {
          event.preventDefault();
          handleAnswerSelection(keyMap[key]);
        }
      } else if (event.key === 'Enter' && nextBtn && !nextBtn.disabled) {
        // Evita disparo duplo caso o foco já esteja no próprio botão Próxima Questão
        if (document.activeElement !== nextBtn) {
          event.preventDefault();
          nextBtn.click();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initQuizEngine);
})(window);
