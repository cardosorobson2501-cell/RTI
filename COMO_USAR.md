# Tier 2 Digital — como usar

Aplicativo para registrar, no celular, a avaliação individual de leitura (Tier 2).
Funciona **sem internet**, **não pede login** e **não envia nada para servidor nenhum**:
os dados dos alunos ficam só no aparelho em que foram lançados.

---

## 1. Colocar o app no ar (só uma vez)

O app é um "site" simples. O jeito grátis é o **GitHub Pages**.

> ⚠️ O GitHub Pages grátis só funciona com repositório **público**.
> Ficam públicos apenas o **código e os itens do protocolo** (palavras, textos, gabaritos).
> **Nenhum dado de aluno** vai para o GitHub: esses dados ficam só no celular.
> Se preferir não deixar os itens do protocolo públicos, fale comigo que eu indico outra opção.

1. Depois de juntar (fazer o *merge* do) pull request na branch `main`, abra o repositório no GitHub.
2. **Settings** (Configurações) → no fim da página, **Change visibility** → **Make public**.
3. **Settings** → **Pages** (menu da esquerda).
4. Em **Source**, escolha **Deploy from a branch**. Em **Branch**, escolha **main** e a pasta **/ (root)**. Toque em **Save**.
5. Espere uns 2 minutos e atualize a página. Vai aparecer o endereço, parecido com:
   `https://cardosorobson2501-cell.github.io/RTI/`

Esse é o link do app. Guarde-o.

## 2. Abrir e instalar no celular

**Android (Chrome):**
1. Abra o link no Chrome (com internet, só desta primeira vez).
2. Toque nos **3 pontinhos ⋮** → **Adicionar à tela inicial** (ou **Instalar app**).
3. Pronto: aparece o ícone azul "Tier 2". Daqui em diante funciona **sem internet**.

**iPhone (Safari):**
1. Abra o link no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta ↑) → **Adicionar à Tela de Início**.

> Use sempre pelo ícone instalado — assim os dados ficam guardados no mesmo lugar.

## 3. Aplicar uma avaliação

1. **＋ Nova avaliação** → preencha nome, turma, Forma etc. (o app lembra avaliador e turma).
2. Siga as telas: cada uma mostra **o que dizer (DIGA)**, as **regras** e **todas as respostas possíveis**.
   - ✓ **Correto** avança sozinho. ✗ **Erro** abre o campo "como o aluno leu" (Módulo 1) ou avança (demais módulos).
   - **2 · 1 · 0** avançam sozinhos.
   - **←** volta uma tela. **☰** abre o menu com todos os módulos e o status de cada um.
3. **Módulo 2 (fluência):** toque em **INICIAR**; toque nas palavras lidas com erro (ficam vermelhas; toque de novo desmarca).
   Aos 60 s o celular vibra e pede para você tocar na **última palavra lida**. Se o aluno acabar antes, toque em **Terminou**.
4. **👁 Mostrar ao aluno** abre a lista/texto em tela cheia (como no Caderno de Estímulos). Toque em **✕ voltar ao avaliador** para voltar.
5. No fim, **Resumo e Decisão**: o app marca os critérios alterados, mostra a árvore de decisão do manual e **sugere** o perfil.
   Você **confirma ou troca** o perfil e preenche hipótese, meta e encaminhamento.

Tudo é salvo a cada toque. Se o navegador fechar, é só abrir de novo — ele volta onde parou.

## 4. Exportar para Excel

- **Um aluno:** na tela *Resumo e Decisão*, toque em **⬇ Exportar este aluno (Excel)**.
- **Todos:** na lista de alunos, toque em **⬇ Excel (todos)**.

O arquivo (ex.: `Tier2_2026-09-28.xlsx`) vai para a pasta **Downloads** e tem duas abas:
- **Resumo** — uma linha por aluno, com todos os totais, porcentagens, critérios alterados e perfis.
- **Itens** — cada resposta, item por item (palavra, acerto/erro, como leu, nota 0/1/2…).

## 5. Backup (não perder dados)

- **💾 Backup** (na lista de alunos) baixa um arquivo `Tier2_backup_DATA.json` com **todas** as avaliações.
  Faça isso ao fim de cada dia de aplicação e guarde o arquivo em local seguro (são dados de menores — LGPD).
- Para trocar de celular: instale o app no novo aparelho e toque em **⤒ Restaurar backup** → escolha o arquivo.
  Avaliações que já existirem não são duplicadas.

> Atenção: "limpar dados do navegador" apaga as avaliações. Por isso o backup é importante.

## 6. Configurações

- **Piso de PCPM**: começa em **100** (piso provisório do manual). Quando tiver o grupo de referência local,
  troque pelo menor valor desse grupo em **⚙ Configurações**.

## Para ajustes futuros (quem for mexer no código)

- `app/dados.js` — todos os itens, textos, gabaritos e rubricas (copiados da Folha de Registro, do Manual e do Caderno).
- `app/regras.js` — pontos de corte (`CORTES`) e a árvore de decisão do manual.
- `teste/aluno_ficticio.js` — confere os cálculos: `node teste/aluno_ficticio.js`.
- Ao alterar arquivos do app, aumente `VERSAO` em `app/sw.js` para os celulares baixarem a versão nova.
