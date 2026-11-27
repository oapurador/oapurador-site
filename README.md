# Site do oApurador e evento público

Site estático para publicação no GitHub Pages. A pasta contém a página institucional, o hub do evento, rankings interativos, inscrições e páginas de resultados de prova. Os caminhos são relativos para copiar o conjunto para a raiz do repositório publicado.

## Arquivos

- `index.html`: página institucional do oApurador.
- `ranking.html`: ranking interativo, com o mesmo cabeçalho, rodapé e folha de estilos da página institucional.
- `eventos.html`: visão hierárquica de evento, etapas e provas.
- `arvore_evento.js`: navegação lateral fixa com links diretos para rankings, inscrições e resultados publicados.
- `inscricoes.html`: relação separada de atletas inscritos, com agrupamento por entidade/categoria e colunas para as provas da etapa.
- `resultados.html`: resultados por prova, agrupados por categoria e com ajustes no tooltip do atleta.
- `styles.css`: estilos compartilhados entre as duas páginas e estilos específicos do ranking.
- `site.js`: atualiza o ano do rodapé.
- `app.js`: carrega o ranking solicitado por ID e implementa busca e simulações no navegador.
- `eventos.js`, `inscricoes.js` e `resultados.js`: carregam e apresentam os respectivos dados públicos.
- `data/evento.json`: relações do evento, etapas, rankings e provas. É o índice que aponta os caminhos dos CSVs.
- `data/rankings/{id}/manifest.json` e `ranking.csv`: manifesto e pontuação agregada de cada ranking, sempre no mesmo padrão para ranking de evento ou de etapa.
- `data/provas/{id}/resultados.csv`: resultados de uma prova, com categoria, percurso, tempos, pontos, situação e ajustes.
- `data/etapas/3/inscricoes.csv`: inscrições da 3ª etapa, utilizadas pela página própria e pela simulação de inscrições futuras no ranking.
- `assets/logo-oapurador.png` e `assets/icone-oapurador.png`: identidade visual e ícone das páginas.

## Publicação e atualização

Mantenha as páginas HTML/JS, `styles.css`, `site.js`, `assets/` e `data/` juntos na raiz publicada pelo GitHub Pages. Os caminhos entre os arquivos são relativos. A página `index.html` direciona para `eventos.html`. A árvore lateral permanece visível durante a rolagem e habilita os links conforme os arquivos públicos estejam presentes.

Quando um ranking mudar, use a exportação GitHub na página de resultados do ranking. O ZIP salva os arquivos em `data/rankings/{id}/`, sem distinção especial entre ranking de etapa e ranking de evento. Para cada prova, use a opção `CSV do site público (GitHub)` em HubProvas → Resultados; o ZIP cria `data/provas/{id}/resultados.csv`. Extraia cada ZIP na raiz deste site, substituindo os arquivos correspondentes, e envie a pasta atualizada ao repositório. A simulação do ranking acontece no navegador; as páginas públicas não usam login nem API.

Para testar localmente, execute `python -m http.server 8000` nesta pasta e abra `http://localhost:8000`. Abrir `ranking.html` diretamente como `file://` pode impedir o navegador de carregar os CSVs.

Os arquivos em `data/` ficam públicos junto com o site. Publique somente informações que possam ser exibidas publicamente.

## Formato da lista de inscrições futuras

Preencha `data/etapas/3/inscricoes.csv` com estas colunas:

```csv
categoria_id,categoria,atleta_id,atleta,peitoral,entidade_sigla,entidade,sicard,fonte_id,prova_id,prova,prova_data,partida
```

Use os IDs e nomes definidos em `data/evento.json` e no manifesto do ranking. A relação aparece dentro da própria etapa. O manifesto do ranking aponta para este mesmo arquivo para a simulação de inscrições futuras. Na coluna da prova, é exibido o horário de `partida` quando definido, `X` para inscrição sem horário e `—` quando o atleta não está inscrito. O agrupamento da página pode ser desligado ou feito por entidade/categoria.

Os CSVs do GitHub usam vírgula como separador e UTF-8, sem o prefixo `sep=;` usado nos arquivos voltados ao Excel. As páginas do evento, ranking e resultados esperam os caminhos relativos listados nos manifestos. Os rankings de etapa aparecem como pendentes até os respectivos CSVs serem exportados e publicados.
