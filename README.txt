Projeto integrado do Planejador Acadêmico - Farmácia. Arquivos: index.html, styles.css, app.js, disciplinas.js, manifest.json e sw.js. A versão integrada substitui o painel antigo pelo painel modular One UI e salva a última aba aberta.\n

Refatoração arquitetural (2026-10-11):
- appState continua sendo a fonte da verdade para disciplinas concluídas e selecionadas.
- Regras puras de pré-requisitos, análise de intenção de busca e cascata de desbloqueio foram isoladas para testes.
- Índice de busca por disciplina, normalizações de campos, aliases e cache limitado de distância de Levenshtein são preparados/reutilizados para reduzir trabalho por tecla.
- A versão do cache do Service Worker e a query do app.js foram atualizadas para invalidar código antigo.

Correções de bugs (2026-10-12):
- Busca: filtro explícito para disciplinas obrigatórias e condicionadas.
- Busca: reduz falsos positivos de fuzzy matching em consultas de 1–2 caracteres.
- Busca: remove listener inline duplicado que concorria com os eventos de app.js.
- Offline: registra o Service Worker quando servido por HTTP(S), com cache versionado.
- disciplinas.js foi preservado sem alterações.
