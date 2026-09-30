# Changelog — Tier 2 Digital

Resumo das entregas feitas nesta sessão de desenvolvimento.

## 1. App inicial (PR #1)

Criação do app completo: registro digital da avaliação individual de leitura Tier 2.

- `app/dados.js`: todos os itens, textos, gabaritos, rubricas e roteiros "DIGA" copiados fielmente da Folha de Registro, do Manual do Avaliador e do Caderno de Estímulos.
- `app/regras.js`: cálculos automáticos, pontos de corte e a árvore de decisão oficial do Manual (Passos 0–3 → perfis A–E), com reforços e alertas.
- `app/app.js` + `app/style.css`: formulário sequencial para celular (um item por tela, avanço automático, barra de progresso, menu de módulos com status), fluência com palavras tocáveis e cronômetro de 60 s, tela "Mostrar ao aluno" (caderno digital), Resumo e Decisão com confirmação do perfil.
- Exportação `.xlsx` (abas **Resumo** e **Itens**) via SheetJS embutido; backup/restauração em `.json`.
- PWA (`sw.js` + `manifest.json`): funciona offline e instala na tela inicial.
- `COMO_USAR.md`: guia passo a passo (GitHub Pages, instalação, Excel, backup).
- `teste/aluno_ficticio.js`: confere os cálculos com um aluno fictício e casos de controle para cada perfil (A–E).

**Decisões tomadas com o usuário:**
- Perfil sugerido pela árvore oficial do Manual (a prosódia não entra no Passo 1; anáfora **e** conectivos alterados juntos contam como linguagem alterada no Passo 2).
- Vocabulário (5a/5b): a folha original repete o critério de 0 pontos na coluna de 1 ponto — o app mostra um texto genérico de "resposta parcial" no lugar.
- Módulos 6 e 7 são opcionais, com chave aplicar/pular e aviso quando o Passo 1 der alterado.
- Cada tela mostra só o item em avaliação, com todas as respostas possíveis escritas por extenso (o avaliador não tem folha nem manual em mãos).

## 2. Ajustes após teste real no celular (PR #2)

- **Módulo 0**: cada pergunta dividida em partes com respostas prontas para tocar (ex.: "Usa óculos?" → sim/não/tem, mas não usa), mantendo sempre um campo de texto livre opcional.
- **Módulos 1 e 7**: tocar em ✗ Erro não abre mais o teclado automaticamente (atrapalhava o ritmo da aplicação); o campo "como leu/escreveu" continua disponível, só abre se tocado.
- **Módulo 2 (fluência)**:
  - Palavras só podem ser marcadas como erro depois de tocar em ▶ INICIAR (evita marcações acidentais antes do cronômetro).
  - Contador de erros passou a atualizar ao vivo durante a leitura (antes ficava travado em 0).
  - Corrigido o zoom de "toque duplo" do navegador, que ampliava e cortava a tela ao marcar duas palavras rápido.
- **Prosódia**: os níveis 2 e 3 de cada dimensão (que a folha não descreve) ganharam texto de apoio, traduzido da escala original de Zutell & Rasinski (1991); os níveis 1 e 4 continuam exatamente como na folha.
- Excel passou a incluir as respostas do Módulo 0.

## 3. Identificação entre avaliadores (PR #3)

Contexto: duas professoras aplicando a avaliação em aparelhos separados, trocando backups.

- **Código visível da avaliação** (ex.: `UD5-896`): mostrado na lista, no menu, no Resumo e na 1ª coluna do Excel. É esse código que o "Restaurar backup" usa para reconhecer a mesma avaliação vinda de outro aparelho — evita duplicar e garante que a versão mais recente prevalece.
- **Campo "Nº do aluno"** (matrícula ou nº de chamada), opcional, também exportado no Excel — útil para cruzar com a planilha do painel RTI/MTSS.
- Mensagem de restauração de backup mais clara (quantas avaliações foram adicionadas / atualizadas / mantidas sem mudança).

**Comportamento confirmado por teste (dois celulares simulados):**
| Situação | Resultado |
|---|---|
| Restaurar backup de outra avaliadora | avaliação **adicionada** |
| Restaurar o mesmo backup de novo | **não duplica** |
| Avaliadora corrige e reenvia backup | avaliação **atualizada** |
| Restaurar depois um backup mais antigo | mantém a versão **mais nova** |

⚠️ Se duas pessoas editarem a **mesma** avaliação em aparelhos diferentes, a última salva substitui a outra por inteiro (não há mesclagem de campos). Recomendação: cada avaliação só é editada por quem a aplicou.

## 4. Campos obrigatórios na identificação

- Nome completo do aluno (nome e sobrenome), turma e avaliador(a) passam a ser obrigatórios; o app não avança e destaca em vermelho o que falta.

## 5. Segurança e redundância dos dados

Auditoria do armazenamento encontrou riscos reais de perda, agora corrigidos:
- 🔴 **Dado corrompido** podia fazer o app começar vazio e sobrescrever tudo → agora o registro danificado vai para a quarentena e nada é sobrescrito.
- 🔴 **App aberto em duas janelas** podia apagar o trabalho da outra → agora cada avaliação é gravada separadamente e as janelas se sincronizam.
- 🟠 Espaço cheio, limpeza automática do navegador e apagar por engano.

**4 camadas de proteção:**
1. **Gravação dupla** (`app/armazenamento.js`): cada avaliação salva no IndexedDB (principal) e no localStorage (espelho), com conferência; ao abrir, os dois são juntados e o lado que falhou é reparado. Migração automática do formato antigo, preservando a cópia antiga.
2. **Cópias automáticas internas**: ao trocar de módulo, ao confirmar perfil, a cada 10 min e antes de restaurar/apagar (10 mais recentes), restauráveis em Configurações.
3. **Cópia fora do celular**: alerta na lista, lembrete ao concluir a avaliação, botão de compartilhar (Drive/e-mail/WhatsApp) e **download automático ao abrir o app após 24 h sem cópia**.
4. **Proteções de uso**: lixeira de 30 dias, pedido de armazenamento protegido, aviso de espaço quase cheio, aviso para iPhone fora do ícone, aviso fixo se uma gravação falhar, painel "Segurança dos dados" em Configurações.

Teste novo `teste/seguranca_dados.js`: 11 situações de falha simuladas, todas aprovadas.

## 6. Cronômetro da leitura silenciosa (Módulo 3)

- Na tela do texto **LIDO pelo aluno (em silêncio)** há um cronômetro.
- Ele **liga sozinho** ao tocar em 👁 Mostrar ao aluno e **para sozinho** ao tocar em ✕ voltar ao avaliador (ou em "Texto recolhido → Reconto"). Também pode ser ligado/parado/zerado à mão.
- O aluno não vê o cronômetro (para não pressioná-lo).
- O tempo aparece (editável) na tela de resultado do texto lido e vai para o Excel: coluna **Tempo leitura silenciosa (s)** na aba Resumo e uma linha na aba Itens.

## Como testar localmente

```bash
node teste/aluno_ficticio.js   # confere os cálculos e a árvore de decisão
node teste/seguranca_dados.js  # simula falhas de armazenamento (precisa do Playwright)
```

Para testes de tela, o app é estático — basta servir a pasta `app/` (ex.: `npx http-server app`) e abrir no navegador ou simulador de celular.

---
_Última atualização: cronômetro da leitura silenciosa_
