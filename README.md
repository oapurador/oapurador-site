# Site do oApurador e ranking interativo

Site estático para publicação no GitHub Pages. A pasta contém a página institucional e o ranking interativo de 2026, com arquivos e links relativos para que o conjunto possa ser copiado para a raiz do repositório publicado.

## Arquivos

- `index.html`: página institucional do oApurador.
- `ranking.html`: ranking interativo, com o mesmo cabeçalho, rodapé e folha de estilos da página institucional.
- `styles.css`: estilos compartilhados entre as duas páginas e estilos específicos do ranking.
- `site.js`: atualiza o ano do rodapé.
- `app.js`: carrega os dados e implementa busca e simulações do ranking no navegador.
- `data/manifest.json`: nome do ranking, competições, categorias e configurações de descarte e bônus.
- `data/ranking.csv`: pontuação agregada por atleta/categoria e contribuições por competição.
- `data/inscricoes_futuras.csv`: modelo para inscrições em competições futuras; quando preenchido, habilita essa opção na página.
- `assets/logo-oapurador.png` e `assets/icone-oapurador.png`: identidade visual e ícone das páginas.

## Publicação e atualização

Mantenha `index.html`, `ranking.html`, `styles.css`, `site.js`, `app.js`, `assets/` e `data/` juntos na raiz publicada pelo GitHub Pages. Os caminhos entre os arquivos são relativos.

Quando o ranking mudar, use a exportação GitHub na página de resultados para baixar um ZIP com `data/ranking.csv` e `data/manifest.json`. Extraia o ZIP na raiz deste site, substituindo os arquivos anteriores, e envie a pasta ao repositório. A simulação de descartes e bônus acontece no navegador; não há login, API ou exportação PDF nesta versão.

Para testar localmente, execute `python -m http.server 8000` nesta pasta e abra `http://localhost:8000`. Abrir `ranking.html` diretamente como `file://` pode impedir o navegador de carregar os CSVs.

Os arquivos em `data/` ficam públicos junto com o site. Publique somente informações que possam ser exibidas publicamente.

## Formato da lista de inscrições futuras

Preencha `data/inscricoes_futuras.csv` com estas colunas:

```csv
categoria_id,categoria,atleta_id,atleta,peitoral,entidade_sigla,entidade,sicard,fonte_id,prova_id,prova,prova_data,partida
```

Use os IDs e nomes das categorias e competições definidos em `data/manifest.json`. `fonte_id` pode ser preenchido diretamente; se estiver vazio, a página relaciona a inscrição usando `prova_id` e o `prova_id` da fonte no manifesto. Na coluna da competição, é exibido o horário de `partida` quando definido, `X` para inscrição sem horário e `—` quando o atleta não está inscrito.

Os CSVs do GitHub usam vírgula como separador e UTF-8, sem o prefixo `sep=;` usado nos arquivos voltados ao Excel. A exportação GitHub na página de resultados gera o `ranking.csv` com as colunas esperadas pelo ranking interativo e o `manifest.json` com estado das competições, configurações e ordem das categorias.
