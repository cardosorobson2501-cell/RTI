/* =====================================================================
   DADOS DO PROTOCOLO — copiados da Folha de Registro, do Manual do
   Avaliador e do Caderno de Estímulos (Tier 2). Não altere itens,
   gabaritos ou critérios sem conferir com os documentos oficiais.
   ===================================================================== */
(function (root) {
  const G = (grupo, lista) => lista.map((t) => ({ g: grupo, t }));

  const D = {};

  /* ---------------- CABEÇALHO ---------------- */
  D.dominiosTriagem = ['Vocabulário', 'Compreensão', 'Inferência', 'Síntese'];

  /* ---------------- MÓDULO 0 ---------------- */
  D.m0 = {
    titulo: 'Módulo 0 — Conversa inicial e condições básicas',
    tempo: '3 min',
    roteiro: 'Use as perguntas como roteiro, em tom de conversa. O objetivo é criar vínculo e levantar hipóteses que precisam ser descartadas antes de interpretar o resto: dificuldade visual ou auditiva não identificada, faltas, alfabetização interrompida, trabalho, sono, desinteresse pela leitura escolar.',
    regras: [
      'Se o aluno não enxerga bem de perto ou tem histórico sugestivo de perda auditiva, registre e encaminhe, e interprete os resultados com cautela.',
    ],
    perguntas: [
      'Usa óculos? Enxerga bem o quadro? Última consulta ao oftalmologista:',
      'Ouve bem? Costuma pedir para repetir? Teve muitas dores de ouvido / otites?',
      'Como aprendeu a ler? Teve dificuldade? Já repetiu de ano?',
      'Gosta de ler? O que lê fora da escola (celular, redes, religião, trabalho)?',
      'Onde sente mais dificuldade: ler as palavras, entender, lembrar, prestar atenção?',
      'Trabalha? Dorme bem? Algo que atrapalhe os estudos agora?',
      'E o celular? Tem um? Quanto tempo usa por dia? Usa até tarde da noite?',
    ],
    engajamento: ['colaborou bem', 'oscilou', 'pouco engajado'],
    // Cada pergunta da folha dividida em partes com respostas prontas.
    // multi: true = pode marcar mais de uma. Sempre há um campo de texto livre.
    segmentos: [
      [
        { id: 'oculos', p: 'Usa óculos?', ops: ['sim', 'não', 'tem, mas não usa'] },
        { id: 'quadro', p: 'Enxerga bem o quadro?', ops: ['sim', 'com dificuldade', 'não'] },
        { id: 'oftalmo', p: 'Última consulta ao oftalmologista', ops: ['menos de 1 ano', '1 a 2 anos', 'mais de 2 anos', 'nunca foi', 'não sabe'] },
      ],
      [
        { id: 'ouve', p: 'Ouve bem?', ops: ['sim', 'às vezes', 'não'] },
        { id: 'repetir', p: 'Costuma pedir para repetir?', ops: ['não', 'às vezes', 'com frequência'] },
        { id: 'otite', p: 'Teve muitas dores de ouvido / otites?', ops: ['não', 'algumas', 'muitas', 'não sabe'] },
      ],
      [
        { id: 'aprendeu', p: 'Como aprendeu a ler?', ops: ['na escola, na idade esperada', 'na escola, com atraso', 'em casa / com a família', 'não lembra'] },
        { id: 'dific', p: 'Teve dificuldade?', ops: ['não', 'um pouco', 'muita'] },
        { id: 'repetiu', p: 'Já repetiu de ano?', ops: ['não', 'sim, 1 vez', 'sim, 2 vezes ou mais'] },
      ],
      [
        { id: 'gosta', p: 'Gosta de ler?', ops: ['sim', 'mais ou menos', 'não'] },
        { id: 'le', p: 'O que lê fora da escola?', multi: true, ops: ['celular / redes sociais', 'mensagens (WhatsApp)', 'livros', 'religião (Bíblia etc.)', 'trabalho', 'quadrinhos / mangá', 'notícias', 'jogos', 'quase nada'] },
      ],
      [
        { id: 'onde', p: 'Onde sente mais dificuldade?', multi: true, ops: ['ler as palavras', 'entender', 'lembrar', 'prestar atenção', 'nenhuma'] },
      ],
      [
        { id: 'trabalha', p: 'Trabalha?', ops: ['não', 'sim, às vezes / bicos', 'sim, meio período', 'sim, período integral'] },
        { id: 'dorme', p: 'Dorme bem?', ops: ['sim', 'às vezes', 'não'] },
        { id: 'atrapalha', p: 'Algo que atrapalhe os estudos agora?', ops: ['não', 'sim (anote abaixo)'] },
      ],
      [
        { id: 'celular', p: 'Tem celular próprio?', ops: ['sim', 'divide com alguém da família', 'não'] },
        { id: 'celTempo', p: 'Quanto tempo usa o celular por dia (fora da escola)?', ops: ['menos de 1 h', '1 a 3 h', '3 a 5 h', 'mais de 5 h', 'não sabe'] },
        { id: 'celUso', p: 'Usa mais para quê?', multi: true, ops: ['vídeos (TikTok, YouTube, Reels)', 'redes sociais', 'jogos', 'conversar / mensagens', 'estudar / pesquisar', 'ler (textos, livros, notícias)'] },
        { id: 'celNoite', p: 'Usa o celular na cama, até tarde da noite?', ops: ['não', 'às vezes', 'quase todo dia'] },
      ],
    ],
  };

  /* ---------------- MÓDULO 1 ---------------- */
  // Ordem = ordem do Caderno de Estímulos (coluna por coluna, de cima para baixo)
  D.m1 = {
    titulo: 'Módulo 1 — Leitura de palavras e pseudopalavras',
    tempo: '5–6 min',
    palavras: {
      nome: 'Palavras reais',
      roteiro: 'Vou te mostrar algumas palavras. Leia em voz alta, uma por uma, do jeito mais certo que conseguir. Não precisa correr. Se não souber, tente mesmo assim.',
      grupos: { A1: 'A1 regulares', A2: 'A2 complexas', A3: 'A3 x ambíguo', A4: 'A4 longas' },
      itens: [].concat(
        G('A1', ['janela', 'sapato', 'menino', 'pipoca', 'tomate', 'cavalo', 'bonito', 'panela', 'parede', 'tijolo']),
        G('A2', ['trabalho', 'chuveiro', 'brinquedo', 'floresta', 'guerreiro', 'carroça', 'pássaro', 'trombone', 'represa', 'problema']),
        G('A3', ['exemplo', 'próximo', 'táxi', 'exame', 'máximo', 'fixo', 'tóxico', 'auxílio', 'exército', 'reflexo']),
        G('A4', ['responsabilidade', 'desenvolvimento', 'extraordinário', 'característica', 'consequentemente', 'infraestrutura', 'paralelepípedo', 'imprescindível', 'biodiversidade', 'inconstitucional'])
      ),
      // disposição no caderno (4 colunas x 10 linhas)
      colunas: 4,
      tituloAluno: 'Leia as palavras em voz alta',
      instrAluno: 'Comece pela primeira coluna, de cima para baixo. Depois passe para a próxima.',
    },
    pseudo: {
      nome: 'Pseudopalavras',
      roteiro: 'Agora são palavras inventadas. Elas não existem. Leia do jeito que você acha que se lê.',
      grupos: { P1: 'P1', P2: 'P2', P3: 'P3' },
      itens: [].concat(
        G('P1', ['bavica', 'lotepa', 'mifola', 'rupeca', 'danifo', 'sotuma', 'pedulo', 'necuta', 'vabeli', 'tuvemo']),
        G('P2', ['chabrim', 'plentosa', 'grinhelo', 'blorquina', 'drunfete', 'quelhampo', 'estrigona', 'guinhasto', 'clersumo', 'trapunda']),
        G('P3', ['cardolimento', 'espratunável', 'trevolidade', 'pansubérico', 'gorvitamente', 'clamperusa', 'destrovinhado', 'bulmarática', 'sintolaferno', 'promelhudice'])
      ),
      colunas: 3,
      tituloAluno: 'Leia estas palavras inventadas em voz alta',
      instrAluno: 'Elas não existem. Leia do jeito que achar que se lê. Comece pela primeira coluna.',
    },
    regras: [
      'Dispare o cronômetro na primeira palavra e pare na última da lista.',
      'Travou mais de 5 s numa palavra → diga “pode passar para a próxima” e marque ERRO.',
      'Autocorreção espontânea conta como CORRETO.',
      'Sotaque (vogais abertas, r final aspirado/omitido, “ti/di” com ou sem chiado) não é erro. Nas pseudopalavras, a sílaba tônica escolhida também não conta.',
      'No erro, escreva só como o aluno leu (ex.: “janéla”).',
    ],
    regraLexicalizacao: 'Lexicalização = ler a pseudopalavra como uma palavra real parecida (ex.: “lotepa” lida como “lote”).',
  };

  /* ---------------- MÓDULO 2 ---------------- */
  D.m2 = {
    titulo: 'Módulo 2 — Fluência de leitura oral (1 minuto)',
    tempo: '2 min',
    roteiro: 'Leia este texto em voz alta, como se estivesse lendo para alguém ouvir. Comece quando eu disser “já”. Já.',
    regras: [
      'Toque na palavra lida com ERRO: troca de palavra, omissão ou hesitação de mais de 3 s (diga a palavra e siga). Toque de novo para desmarcar.',
      'Inserções e repetições NÃO são descontadas (pesam na prosódia).',
      'Aos 60 s, deixe o aluno terminar a frase, mas toque na última palavra lida no 1º minuto.',
      'Se o aluno terminar o texto antes de 60 s, toque em “Terminou”.',
    ],
    tituloTexto: 'A rádio da escola',
    linhas: [
      'Quando a diretora anunciou que a escola teria uma rádio,',
      'quase ninguém acreditou. Não havia estúdio, não havia',
      'equipamento e muito menos dinheiro. Mesmo assim, um grupo',
      'de estudantes resolveu tentar. Eles pediram emprestado um',
      'microfone velho, uma caixa de som e um computador que',
      'ficava parado na biblioteca.',
      'Nas primeiras semanas, os programas eram curtos e cheios',
      'de falhas. O som chiava, alguém sempre esquecia o texto e,',
      'às vezes, a música começava antes da hora. Os colegas riam',
      'no pátio, mas continuavam ouvindo.',
      'Aos poucos, a equipe foi aprendendo. Criaram uma escala',
      'para dividir as tarefas, escreveram roteiros e passaram a',
      'ensaiar antes de cada transmissão. Um professor de física',
      'ajudou a melhorar o som, e a merendeira passou a mandar',
      'recados sobre o cardápio do dia.',
      'No fim do ano, a rádio já tinha programas de notícias,',
      'entrevistas e música local. Os estudantes que antes tinham',
      'vergonha de falar em público agora disputavam o microfone.',
      'E a diretora, que tinha feito o anúncio sem muita certeza,',
      'passou a dizer que aquela tinha sido a melhor ideia da escola.',
    ],
    // índices das linhas que iniciam parágrafo
    paragrafos: [0, 6, 10, 15],
    acumulado: [10, 18, 27, 35, 45, 49, 58, 69, 80, 85, 94, 103, 112, 123, 129, 140, 149, 158, 169, 181],
    prosodia: {
      nome: 'Prosódia — Escala Multidimensional de Fluência (Zutell & Rasinski, 1991)',
      legenda: '1 = pouco desenvolvido … 4 = plenamente adequado',
      dimensoes: [
        // d1 e d4 = âncoras da Folha de Registro; d2 e d3 = níveis intermediários da escala
        // original de Zutell & Rasinski (1991), em tradução resumida.
        { id: 'expressao', nome: 'Expressão e volume', d1: 'Leitura monótona e baixa', d2: 'Alguma expressão em partes do texto, mas ainda foca em “dizer as palavras”; voz ainda baixa', d3: 'Soa como fala natural na maior parte do texto, com alguns trechos sem expressão; volume adequado', d4: 'entonação natural, como na fala, adequada ao sentido' },
        { id: 'fraseamento', nome: 'Fraseamento', d1: 'Palavra por palavra', d2: 'Lê em blocos de 2 ou 3 palavras (leitura “picada”); não marca bem o fim das frases', d3: 'Mistura: emenda frases, faz pausas no meio da frase para respirar, algum “picado”; entonação razoável', d4: 'agrupa as palavras em unidades de sentido e respeita a pontuação' },
        { id: 'fluidez', nome: 'Fluidez', d1: 'Muitas pausas, repetições e tentativas', d2: 'Vários “pontos difíceis” com pausas longas e hesitações que atrapalham', d3: 'Quebras ocasionais por dificuldade com palavras ou frases específicas', d4: 'leitura contínua, com poucas quebras resolvidas sozinho' },
        { id: 'ritmo', nome: 'Ritmo', d1: 'Lento e esforçado', d2: 'Moderadamente lento', d3: 'Irregular: mistura trechos rápidos e lentos', d4: 'ritmo de conversa, constante' },
      ],
      alerta: 'Abaixo de 8 sugere leitura pouco automatizada',
    },
    tituloAluno: 'Leia o texto em voz alta',
    instrAluno: 'Leia como se estivesse lendo para alguém ouvir.',
  };

  /* ---------------- MÓDULO 3 ---------------- */
  const NR = 'Não respondeu ou inadequada.';
  D.m3 = {
    titulo: 'Módulo 3 — Compreensão: texto lido e texto ouvido',
    tempo: '10–12 min',
    roteiroLido: 'Leia este texto em silêncio, com atenção. Quando terminar, eu vou guardar o texto e pedir para você me contar o que leu.',
    roteiroOuvido: 'Agora eu vou ler um texto para você. Preste atenção, porque depois vou pedir para você me contar o que ouviu.',
    regrasLido: ['Mostre o texto ao aluno (botão “Mostrar ao aluno”). Ele lê em silêncio.', 'Quando terminar, RECOLHA o texto antes do reconto e das perguntas.'],
    regrasOuvido: ['Leia o texto abaixo em voz alta UMA única vez, em ritmo natural.', 'Depois, o texto sai da tela antes do reconto e das perguntas.'],
    roteiroReconto: '“Me conte tudo o que você lembra do texto.” Depois: “Lembra de mais alguma coisa?”',
    regraReconto: 'Marque cada ideia recontada (vale a ideia com outras palavras).',
    regraPerguntas: 'Perguntas, sem o texto. Pontue 2 (completa), 1 (parcial) ou 0 (errada, sem resposta ou “não sei”).',
    observacoes: 'Observações (inventou informações? respondeu com conhecimento próprio em vez do texto? percebeu que não entendeu?)',
    textos: {
      A: {
        nome: 'Texto A', titulo: 'O mandacaru',
        paragrafos: [
          'Quem viaja pelo sertão nordestino logo percebe uma planta alta, verde e cheia de espinhos, que continua de pé mesmo nos meses mais secos. É o mandacaru, um cacto típico da caatinga.',
          "O segredo do mandacaru está no caule. Ele é grosso e funciona como uma caixa-d'água: guarda a água das poucas chuvas para os períodos de seca. Os espinhos também ajudam. Eles são, na verdade, folhas transformadas. Como são finos, deixam escapar pouca água e ainda protegem a planta de animais com sede.",
          'Quando a seca aperta e o pasto desaparece, muitos criadores queimam os espinhos do mandacaru e oferecem o caule ao gado. Assim, os animais conseguem se alimentar e se hidratar ao mesmo tempo. Os frutos, vermelhos por fora e brancos por dentro, servem de comida para pássaros e também para pessoas.',
          'Para muitos sertanejos, o mandacaru é mais do que uma planta. Segundo a tradição popular, quando ele floresce na seca, é sinal de que a chuva está chegando.',
        ],
        ideias: [
          'Planta alta, verde, com espinhos',
          'Continua de pé na seca',
          'É um cacto da caatinga / do sertão',
          'O caule é grosso e guarda água',
          "Guarda água das chuvas para a seca (como caixa-d'água)",
          'Os espinhos são folhas transformadas',
          'Os espinhos perdem pouca água e/ou protegem de animais',
          'Na seca, criadores queimam os espinhos e dão ao gado',
          'Os frutos alimentam pássaros e pessoas',
          'Tradição: se floresce na seca, a chuva vai chegar',
        ],
        perguntas: [
          { tipo: 'Literal', p: 'Onde o mandacaru guarda água?', r2: 'No caule.', r1: 'Resposta vaga (“dentro dele”, “na planta”).', r0: NR },
          { tipo: 'Literal', p: 'O que muitos criadores fazem com o mandacaru na seca?', r2: 'Queimam os espinhos e dão o caule ao gado.', r1: 'Só uma parte (“dão para o gado” sem mencionar os espinhos, ou o inverso).', r0: NR },
          { tipo: 'Inferência', p: 'Por que os criadores queimam os espinhos antes de dar o mandacaru ao gado?', r2: 'Para os animais não se machucarem e conseguirem comer.', r1: 'Ideia incompleta (“porque espinho é ruim”).', r0: NR },
          { tipo: 'Inferência', p: 'Por que o mandacaru consegue ficar de pé nos meses mais secos?', r2: 'Porque guarda água no caule e perde pouca água pelos espinhos.', r1: 'Só um dos dois motivos.', r0: NR },
          { tipo: 'Integração', p: 'Por que o mandacaru é importante para os sertanejos na seca?', r2: 'Porque alimenta e hidrata o gado quando falta pasto (e/ou os frutos servem de comida).', r1: 'Menciona utilidade sem relacionar à seca/falta de pasto.', r0: NR },
          { tipo: 'Ideia principal', p: 'Se você fosse contar para alguém, em uma frase, do que trata o texto, o que diria?', r2: 'O mandacaru é um cacto da caatinga adaptado à seca e importante para o sertanejo.', r1: 'Só um detalhe (“fala dos espinhos”) ou só “fala do mandacaru”.', r0: NR },
        ],
      },
      B: {
        nome: 'Texto B', titulo: 'O tatu-bola',
        paragrafos: [
          'Entre os animais da caatinga, poucos são tão curiosos quanto o tatu-bola. Ele é pequeno, tem o corpo coberto por uma carapaça dura e só existe no Brasil.',
          'O que torna esse tatu especial é a sua forma de se defender. Quando se sente ameaçado, ele se enrola completamente e vira uma bola quase perfeita. A carapaça protege a barriga, que é a parte mais frágil do corpo, e muitos predadores desistem de atacar. O tatu-bola passa boa parte da noite procurando formigas e cupins, que são a base da sua alimentação.',
          'O problema é que essa defesa, tão eficiente contra outros animais, não funciona contra as pessoas. Como não corre nem cava buracos com rapidez, o tatu-bola é facilmente capturado por caçadores. Além disso, a destruição da caatinga para abrir pastos e plantações diminui o espaço onde ele vive.',
          'Por isso, a espécie está ameaçada de extinção. Para chamar a atenção para o problema, o tatu-bola já foi escolhido como símbolo de uma Copa do Mundo realizada no Brasil.',
        ],
        ideias: [
          'É um animal da caatinga',
          'É pequeno e tem carapaça dura',
          'Só existe no Brasil',
          'Quando ameaçado, enrola-se e vira uma bola',
          'A carapaça protege a barriga (parte frágil)',
          'Muitos predadores desistem de atacar',
          'Come formigas e cupins (à noite)',
          'A defesa não funciona contra pessoas / é fácil de capturar',
          'A destruição da caatinga diminui o espaço onde vive',
          'Está ameaçado de extinção / foi símbolo de uma Copa',
        ],
        perguntas: [
          { tipo: 'Literal', p: 'O que o tatu-bola faz quando se sente ameaçado?', r2: 'Enrola-se e vira uma bola.', r1: 'Resposta vaga (“se esconde”, “se protege”).', r0: NR },
          { tipo: 'Literal', p: 'Do que o tatu-bola se alimenta?', r2: 'De formigas e cupins.', r1: 'Só um dos dois.', r0: NR },
          { tipo: 'Inferência', p: 'Por que virar uma bola protege o tatu?', r2: 'Porque a carapaça cobre a barriga, que é frágil, e o predador não consegue atacar.', r1: 'Diz só “porque fica protegido”, sem explicar como.', r0: NR },
          { tipo: 'Inferência', p: 'Por que essa defesa não funciona contra caçadores?', r2: 'Porque, enrolado e sem fugir (não corre nem cava rápido), ele é fácil de pegar.', r1: 'Diz só “porque o caçador é mais forte”.', r0: NR },
          { tipo: 'Integração', p: 'Quais são as ameaças ao tatu-bola, segundo o texto, e o que elas têm em comum?', r2: 'Caça e destruição da caatinga; as duas são causadas por pessoas.', r1: 'Cita só uma ameaça ou não relaciona às pessoas.', r0: NR },
          { tipo: 'Ideia principal', p: 'Se você fosse contar para alguém, em uma frase, do que trata o texto, o que diria?', r2: 'O tatu-bola é um animal da caatinga com uma defesa especial, mas está ameaçado por causa das pessoas.', r1: 'Só um detalhe ou só “fala do tatu”.', r0: NR },
        ],
      },
    },
    tituloAluno: 'Leia em silêncio, com atenção. Depois o texto será recolhido e você vai contar o que leu.',
  };

  /* ---------------- MÓDULO 4 ---------------- */
  D.m4 = {
    titulo: 'Módulo 4 — Coesão referencial e conectivos',
    tempo: '4 min',
    // Formato v2 (out/2026): o ALUNO lê na tela e toca na resposta.
    // Antes o avaliador lia em voz alta, com o texto recolhido — isso misturava
    // memória do texto e compreensão oral com a habilidade de coesão.
    // O trecho do texto fica visível (como no SAEB, descritores D2 e D15).
    entregar: 'Entregue o celular ao aluno. Ele lê sozinho e toca na resposta. A tela não mostra o gabarito. Se ele travar ao ler uma palavra, você pode dizê-la (como no Módulo 2), mas não leia a frase inteira nem as opções.',
    anafora: {
      nome: '4a. Anáfora',
      roteiro: 'Agora você vai ler um pedaço do texto que já leu/ouviu. Uma palavra está pintada de amarelo. Toque na resposta que mostra a quem (ou a quê) essa palavra se refere.',
      regras: [
        'O aluno lê o trecho na tela (o texto continua visível) e toca em uma das 3 opções. O app corrige sozinho.',
        'Uma opção errada de propósito é o “assunto geral” do texto (ex.: “o mandacaru” no lugar de “o caule”), o erro mais comum.',
        'Se o aluno não quiser responder, toque em “Não respondeu” (conta como erro).',
      ],
      pergunta: 'A palavra pintada de amarelo se refere a:',
      // trecho: a palavra-alvo vai entre ** **. ok = índice da opção correta.
      itens: [
        { texto: 'A', trecho: 'O segredo do mandacaru está no caule. **Ele** é grosso e funciona como uma caixa-d\'água: guarda a água das poucas chuvas para os períodos de seca. Os espinhos também ajudam. Eles são, na verdade, folhas transformadas.', ops: ['o mandacaru', 'o caule', 'o segredo'], ok: 1 },
        { texto: 'A', trecho: 'Ele é grosso e funciona como uma caixa-d\'água: guarda a água das poucas chuvas para os períodos de seca. Os espinhos também ajudam. **Eles** são, na verdade, folhas transformadas. Como são finos, deixam escapar pouca água e ainda protegem a planta de animais com sede.', ops: ['os períodos de seca', 'os animais', 'os espinhos'], ok: 2 },
        { texto: 'A', trecho: 'Para muitos sertanejos, o mandacaru é mais do que uma planta. Segundo a tradição popular, quando **ele** floresce na seca, é sinal de que a chuva está chegando.', ops: ['o mandacaru', 'o sertanejo', 'o sinal'], ok: 0 },
        { texto: 'B', trecho: 'Entre os animais da caatinga, poucos são tão curiosos quanto o tatu-bola. **Ele** é pequeno, tem o corpo coberto por uma carapaça dura e só existe no Brasil.', ops: ['o Brasil', 'o tatu-bola', 'o corpo'], ok: 1 },
        { texto: 'B', trecho: 'Quando se sente ameaçado, ele se enrola completamente e vira uma bola quase perfeita. A carapaça protege a barriga, **que** é a parte mais frágil do corpo, e muitos predadores desistem de atacar.', ops: ['a carapaça', 'a bola', 'a barriga'], ok: 2 },
        { texto: 'B', trecho: 'Como não corre nem cava buracos com rapidez, o tatu-bola é facilmente capturado por caçadores. Além disso, a destruição da caatinga para abrir pastos e plantações diminui o espaço onde **ele** vive.', ops: ['o tatu-bola', 'o espaço', 'o caçador'], ok: 0 },
      ],
    },
    conectivos: {
      nome: '4b. Conectivos',
      roteiro: 'Agora leia cada frase. Falta uma palavra no lugar do traço. Toque na palavra que fica melhor ali.',
      regras: [
        'O aluno lê a frase e as três opções na tela e toca na resposta. O app corrige sozinho.',
        'Se o aluno não quiser responder, toque em “Não respondeu” (conta como erro).',
      ],
      itens: [
        { rel: 'Causa', frase: 'Ele chegou atrasado ___ o ônibus quebrou no caminho.', ops: ['porque', 'mas', 'então'], ok: 0 },
        { rel: 'Oposição', frase: 'Ela treinou todos os dias, ___ não conseguiu vencer a corrida.', ops: ['e', 'porque', 'mas'], ok: 2 },
        { rel: 'Condição', frase: '___ chover amanhã, o jogo vai ser cancelado.', ops: ['Se', 'Porque', 'Mas'], ok: 0 },
        { rel: 'Conclusão', frase: 'Estudou a semana toda, ___ tirou uma boa nota.', ops: ['embora', 'portanto', 'se'], ok: 1 },
        { rel: 'Concessão', frase: '___ estivesse cansado, ele terminou o trabalho.', ops: ['Embora', 'Porque', 'Quando'], ok: 0 },
        { rel: 'Adição', frase: 'Ele lavou a louça ___ arrumou o quarto.', ops: ['mas', 'e', 'porque'], ok: 1 },
        { rel: 'Finalidade', frase: 'Ele economizou dinheiro ___ comprar uma bicicleta.', ops: ['mas', 'se', 'para'], ok: 2 },
        { rel: 'Tempo', frase: '___ o sol nasceu, os pássaros começaram a cantar.', ops: ['Mas', 'Quando', 'Portanto'], ok: 1 },
      ],
    },
  };

  /* ---------------- MÓDULO 5 ---------------- */
  // 1 ponto: a folha repete o critério de 0 por engano; texto genérico aprovado pelo avaliador.
  const UM = 'Resposta parcial: só dá um exemplo, uso vago ou ideia incompleta.';
  const ZERO = 'Não respondeu, “não sei” ou resposta inadequada.';
  D.m5 = {
    titulo: 'Módulo 5 — Vocabulário',
    tempo: '6 min',
    oral: {
      nome: '5a. Vocabulário oral',
      roteiro: 'Vou falar algumas palavras. Me explique o que cada uma quer dizer.',
      regras: [
        'Fale a palavra; o aluno NÃO lê.',
        'Se ele só der um exemplo, peça uma vez: “E o que ela significa?”',
      ],
      um: UM, zero: ZERO,
      itens: [
        ['compartilhar', 'Dividir algo com outras pessoas; deixar outros usarem ou saberem.'],
        ['obstáculo', 'Algo que impede ou dificulta passar ou avançar.'],
        ['consequência', 'O que acontece como resultado de algo.'],
        ['adaptar', 'Mudar ou ajustar para se ajustar a uma situação nova.'],
        ['hesitar', 'Ficar em dúvida antes de agir; demorar a decidir.'],
        ['evidente', 'Claro, óbvio, fácil de perceber.'],
        ['escasso', 'Que existe em pouca quantidade; que está faltando.'],
        ['precaução', 'Cuidado tomado antes para evitar um problema.'],
        ['autônomo', 'Que age ou decide por conta própria; independente.'],
        ['hipótese', 'Ideia ou suposição que ainda precisa ser confirmada.'],
        ['ambíguo', 'Que pode ter mais de um sentido; que gera dúvida.'],
        ['efêmero', 'Que dura pouco tempo; passageiro.'],
      ],
    },
    comando: {
      nome: '5b. Vocabulário de comando',
      roteiro: 'Agora são palavras que aparecem em enunciados de prova. Me explique o que cada uma quer dizer.',
      regras: [
        'Mesma pontuação (2/1/0). Fale o termo; o aluno não lê.',
        'Se ele só der um exemplo, peça uma vez: “E o que ela significa?”',
      ],
      um: UM, zero: ZERO,
      itens: [
        ['tese', 'A ideia principal que um texto defende ou tenta provar.'],
        ['argumento', 'Uma razão ou explicação usada para defender uma ideia.'],
        ['finalidade', 'O objetivo, para que serve um texto ou uma ação.'],
        ['inferir', 'Concluir algo que não está escrito, a partir de pistas do texto.'],
        ['posicionamento', 'A opinião ou o lado que o autor defende sobre um assunto.'],
        ['efeito de sentido', 'O que uma palavra, imagem ou sinal de pontuação faz o leitor entender ou sentir.'],
        ['marcas linguísticas', 'Pistas no jeito de escrever ou falar que mostram quem é o autor ou para quem ele fala.'],
        ['recurso (do texto)', 'Uma ferramenta usada no texto para causar um efeito, como repetição, imagem ou ironia.'],
        ['tema', 'O assunto principal do texto.'],
        ['conectivo', 'Palavra que liga partes de uma frase ou de um texto, como “mas”, “porque”, “e”.'],
        // Acrescentadas em out/2026 (matriz SAEB-BNCC 9º ano e frequência nos comandos do ENEM 2009–2023)
        ['variação linguística', 'As diferentes formas de usar a mesma língua, que mudam conforme a região, o grupo social, a idade ou a situação (mais formal ou mais informal).'],
        ['gênero textual', 'O tipo de texto que circula na sociedade, reconhecido pela finalidade, pelo formato e pela linguagem, como notícia, receita, carta, anúncio ou conto.'],
      ],
      // Avaliações feitas antes da mudança usam só as 10 primeiras palavras.
      nAntigo: 10,
    },
    alerta5b: 'Se 5b ficar bem abaixo de 5a: considerar dificuldade com o formato/vocabulário de prova, e não com a linguagem em geral. Não tratar como Perfil B: ensinar explicitamente o vocabulário de comando (Tier 1, para a turma toda).',
  };

  /* ---------------- MÓDULO 6 ---------------- */
  D.m6 = {
    titulo: 'Módulo 6 — Processamento fonológico',
    tempo: '6–8 min',
    condicao: 'Só se o Passo 1 (reconhecimento de palavras) estiver alterado.',
    supressao: {
      nome: '6a. Supressão de fonema',
      roteiro: 'Diga sapo sem o /s/.',
      regras: [
        'Diga o SOM, não o nome da letra.',
        'Treino antes: “bala sem o /b/” → “ala”.',
      ],
      itens: [
        ['sapo', '/s/', 'apo'], ['bolo', '/b/', 'olo'], ['prato', '/r/', 'pato'], ['grato', '/g/', 'rato'],
        ['trigo', '/r/', 'tigo'], ['flor', '/l/', 'for'], ['blusa', '/l/', 'busa'], ['planta', '/l/', 'panta'],
        ['carta', '/r/ (do meio)', 'cata'], ['caneta', '/n/', 'caeta'], ['fruta', '/t/', 'frua'], ['tapete', '/p/', 'taete'],
      ],
    },
    repeticao: {
      nome: '6b. Repetição de pseudopalavras',
      roteiro: 'Repita exatamente o que eu disser.',
      regras: [
        'Fale UMA vez, em ritmo natural, sem deixar ver sua boca de perto. Não repita.',
        'Vale só a repetição completa e exata.',
      ],
      itens: ['fepa', 'nudi', 'gavo', 'tamifu', 'poledo', 'rucabe', 'pudamoli', 'nefotica', 'galupina', 'tomalipuca', 'dibenafolo', 'rufacomipe'],
    },
    nomeacao: {
      nome: '6c. Nomeação automática rápida',
      regras: [
        'Faça a linha de treino, depois cronometre da primeira à última das 50 unidades.',
        'Pular ou repetir linha ANULA a medida.',
      ],
      letras: {
        nome: 'Letras', roteiro: 'Diga o nome das LETRAS o mais rápido que conseguir. Da esquerda para a direita, linha por linha, como se estivesse lendo.',
        treino: ['s', 'a', 'd', 'o', 'p'],
        grade: [
          ['p', 'o', 'd', 'o', 'p', 'd', 'p', 'a', 'p', 'd'],
          ['o', 'd', 'a', 'p', 'a', 'd', 's', 'd', 'p', 's'],
          ['o', 's', 'p', 's', 'o', 'p', 's', 'a', 'd', 'o'],
          ['a', 'p', 's', 'o', 'a', 's', 'o', 'a', 'p', 'o'],
          ['d', 'p', 'd', 's', 'a', 'o', 'a', 'o', 'a', 'd'],
        ],
      },
      numeros: {
        nome: 'Números', roteiro: 'Diga o nome dos NÚMEROS o mais rápido que conseguir. Da esquerda para a direita, linha por linha, como se estivesse lendo.',
        treino: ['7', '2', '9', '4', '6'],
        grade: [
          ['9', '7', '6', '7', '2', '4', '2', '9', '6', '9'],
          ['2', '6', '9', '6', '4', '6', '2', '4', '6', '7'],
          ['6', '4', '2', '7', '4', '6', '7', '6', '9', '2'],
          ['9', '6', '7', '6', '7', '2', '6', '9', '2', '7'],
          ['2', '4', '6', '9', '6', '9', '7', '2', '4', '6'],
        ],
      },
      leitura: 'Tempo de nomeação alto com consciência fonêmica adequada sugere um componente de velocidade de processamento (duplo déficit, Wolf & Bowers, 1999).',
    },
  };

  /* ---------------- MÓDULO 7 ---------------- */
  D.m7 = {
    titulo: 'Módulo 7 — Ditado',
    tempo: '10 min (pode ser em pequeno grupo)',
    condicao: 'Só se o Passo 1 (reconhecimento de palavras) estiver alterado.',
    roteiro: 'Diga a palavra, uma frase curta com ela (menos nas pseudopalavras) e a palavra de novo. O aluno escreve na folha de ditado (numerada de 1 a 28).',
    regras: [
      'Nas pseudopalavras, aceite qualquer grafia que represente a pronúncia (ex.: s, ss ou ç para o som /s/).',
      'Corrija depois, olhando a folha do aluno: ✓ ou ✗ em cada palavra.',
    ],
    grupos: [
      { id: 'reg', nome: 'Regulares', itens: ['caneta', 'tomate', 'pipoca', 'sapato', 'formiga'] },
      { id: 'ctx', nome: 'Regras contextuais', itens: ['barraca', 'honra', 'quiabo', 'sombra', 'pássaro', 'carroça', 'campeão', 'guitarra'] },
      { id: 'arb', nome: 'Arbitrárias', itens: ['exemplo', 'hoje', 'girafa', 'próximo', 'exceção', 'casamento', 'cachorro'] },
      { id: 'pse', nome: 'Pseudopalavras', itens: ['bapita', 'nofeta', 'gruplina', 'candorra', 'quimbelo', 'sarrufo', 'franquilho', 'desbolvite'] },
    ],
    zorzi: [
      'Representações múltiplas (ex.: s/z/ss/ç, x/ch, g/j)',
      'Apoio na oralidade (escreve como fala: “fazeno”, “pexe”)',
      'Omissão de letras',
      'Acréscimo de letras',
      'Trocas surdas/sonoras (p/b, t/d, f/v, c/g)',
      'Generalização de regras (ex.: “u” no fim por analogia ao “l”)',
      'Junção ou separação indevida',
      'Confusão am/ão, letras parecidas, inversões',
    ],
    tituloZorzi: 'Classificação dos erros (Zorzi, 1998) — marque os tipos que aparecem com frequência',
    leitura: 'Predomínio de erros fonológicos (omissões, trocas surdas/sonoras, apoio que altera sons) aponta para decodificação/processamento fonológico; predomínio de erros em grafias arbitrárias com escrita fonologicamente correta aponta para conhecimento ortográfico.',
  };

  /* ---------------- RESUMO ---------------- */
  D.perfis = {
    A: 'Perfil A — Reconhecimento de palavras (decodificação / fluência)',
    B: 'Perfil B — Compreensão da linguagem (vocabulário / inferência)',
    C: 'Perfil C — Misto (palavra + linguagem)',
    D: 'Perfil D — Compreensão leitora específica (estratégias / monitoramento)',
    E: 'Perfil E — Dificuldade não confirmada → Tier 1 com monitoramento',
  };
  D.intervencao = {
    A: { foco: 'Decodificação de polissílabas (divisão silábica, prefixos, sufixos e radicais); leitura repetida de textos com modelo e retorno; ensino explícito de regras ortográficas.', monitorar: 'PCPM em textos paralelos; precisão em listas de palavras longas e pseudopalavras.' },
    B: { foco: 'Ensino direto de vocabulário acadêmico e de famílias de palavras; conhecimento de mundo; perguntas e inferências durante a leitura; resumo, ideia principal e estrutura do texto; muita discussão oral. Se anáfora/conectivos alterados: leitura compartilhada com paradas explícitas para “quem é esse ele/ela?” e para nomear a relação que cada conectivo cria.', monitorar: 'Reconto e perguntas em textos paralelos; vocabulário ensinado; anáfora e conectivos em textos novos.' },
    C: { foco: 'Combinar os dois focos. Priorizar palavra e fluência no início, sem suspender o trabalho com vocabulário e compreensão.', monitorar: 'PCPM e compreensão, alternados.' },
    D: { foco: 'Estratégias de compreensão e de monitoramento (perceber que não entendeu e o que fazer), leitura com propósito, motivação e autoconceito de leitor. Se anáfora/conectivos alterados: mesmo foco do Perfil B nesse ponto específico.', monitorar: 'Reconto e perguntas em textos lidos.' },
    E: { foco: 'Volta ao Tier 1 com atenção do professor. Rever o que aconteceu na triagem (engajamento, formato, tempo).', monitorar: 'Próxima triagem universal.' },
  };
  D.encaminhamentos = ['não', 'visão', 'audição', 'fonoaudiologia', 'psicologia', 'outro'];
  D.lembrete = 'Este registro descreve o desempenho em uma sessão. Não é laudo e não atribui diagnóstico.';

  root.DADOS = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
