# Cerimonial Sudoeste: versão melhorada

Esta pasta é uma cópia completa do app, no mesmo formato do Lovable (TanStack Start + Supabase).
Todas as funções originais foram mantidas: página pública, ordem do culto, login (e-mail e Google),
painel, editor com arrastar e soltar, cronômetro com tela de retorno, avisos, acessos por papel,
exportação para o LouvorJA e instalação como app.

## Como colocar no ar

1. Suba o conteúdo desta pasta para um repositório no GitHub.
2. No Lovable, conecte o projeto a esse repositório (ou crie um projeto novo a partir dele).
   O arquivo `.env` aponta para o mesmo banco do site atual. Para uma cópia com banco separado,
   troque as chaves do `.env` pelas do novo projeto.
3. Aplique a migração nova, `supabase/migrations/20261030120000_melhorias_seguranca_e_ordem.sql`.
   No Lovable, basta pedir: "aplique a migração 20261030120000_melhorias_seguranca_e_ordem".
   O app funciona mesmo antes disso: a reordenação dos itens volta para o modo antigo automaticamente.

## Correções importantes

- **Segurança dos avisos.** Na versão atual, qualquer pessoa logada consegue disparar avisos para todos
  os usuários, porque a última alteração da função `notificar_programacao` apagou a checagem de
  permissão. A migração devolve essa checagem: só administrador e cerimonialista enviam avisos, e só
  para programações publicadas.
- **Preferência de avisos.** A opção "receber avisos" existia no código, mas não aparecia na tela e
  era ignorada pelo banco. Agora ela aparece em Avisos e é respeitada.
- **Data errada à noite.** A tela "Nova programação" usava a data em UTC; depois das 21h (horário de
  Brasília) ela sugeria o dia seguinte. Agora usa a data local.
- **Reordenar itens.** Cada arrastar e soltar fazia uma chamada ao banco por item. Agora é uma chamada
  só, que grava a ordem e recalcula os horários no servidor.
- **Horários sempre certos.** Mudar a duração de um item ou o horário de início do culto agora
  recalcula os horários de todos os itens automaticamente.
- **Proteção contra se trancar fora.** O administrador não consegue mais remover o próprio papel de
  administrador por engano.
- **Avisos de conexão.** A faixa de "tentando reconectar" não fechava enquanto houvesse um erro antigo
  registrado. Agora fecha e só volta se surgir um erro novo.
- **Modo offline.** O service worker não guardava nada em cache. Agora guarda as páginas e arquivos do
  app, que abre mesmo com internet instável.

## O que mudou para quem usa

**Página pública**
- Card de "Hoje" em destaque, mostrando o que está acontecendo agora no culto, ou a hora de início.
- Próximos cultos em lista, com dia da semana.
- Ordem do culto em linha do tempo, com o item atual marcado em dourado e os já passados mais claros.
- Término previsto, botão de compartilhar (WhatsApp, etc.) e versão para impressão.

**Painel**
- Abas Próximas, Rascunhos e Anteriores, com contagem, e busca por título, pregador ou tema.
- O código da tela de retorno aparece sempre no painel; antes só aparecia depois do primeiro uso.
- Duplicar programação abre uma janela com calendário (antes era um campo de texto do navegador),
  sugerindo a mesma data na semana seguinte.

**Nova programação**
- Escolher o tipo de culto já preenche o título e o horário de início habituais.

**Editor**
- Atalhos para adicionar os itens mais comuns com um toque (Prelúdio, Hino de abertura, Oração,
  Sermão, Ofertório…).
- Duração total e horário de término no topo.
- Ações de cada item num menu (editar, duplicar, ocultar, excluir), com o cronômetro sempre à mão.
- Observações internas, horário real e itens ocultos aparecem como etiquetas na lista.
- Confirmações em janelas próprias do app, em vez das caixas do navegador.
- No computador, layout em duas colunas com as ferramentas ao lado.

**Cronômetro e tela de retorno**
- Botões de +1 min e −1 min durante a contagem.
- A tela de retorno mostra o relógio, tem botão de tela cheia e mantém a tela da TV ou do tablet acesa.
- Aviso na tela quando a conexão cai.

**Acessos**
- Busca de pessoas, equipe listada primeiro e explicação de cada papel ao lado.

**Visual**
- Identidade construída a partir do próprio logo: índigo profundo, com a faixa de vitral
  magenta–anil e dourado só para marcar "agora".
- Tipografia Instrument Serif (títulos) e Hanken Grotesk (texto).
- Telas responsivas: confortáveis no celular e aproveitando a largura no computador.
- Textos revisados, mensagens de erro em português e páginas de erro e 404 traduzidas.
- Convite para instalar o app mais discreto, que some por 30 dias se for fechado.

## Arquivos novos

- `src/components/marca.tsx`: cabeçalho, painéis, confirmações e estilos de botão compartilhados.
- `src/lib/timer.ts`: código da tela de retorno e funções do cronômetro.
- `src/hooks/use-now.ts`: relógio usado para marcar o item atual.
- `supabase/migrations/20261030120000_melhorias_seguranca_e_ordem.sql`: correções no banco.
