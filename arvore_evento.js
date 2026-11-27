async function carregarArvoreEvento() {
  const aside = document.querySelector('#event-tree');
  if (!aside) return;
  try {
    const resposta = await fetch('data/evento.json');
    if (!resposta.ok) throw new Error('Manifesto do evento indisponível.');
    const dados = await resposta.json();
    const nav = document.createElement('nav');
    nav.className = 'event-tree-nav';
    nav.setAttribute('aria-label', 'Navegação do evento');
    const titulo = document.createElement('h2');
    titulo.textContent = `${dados.evento.sigla} ${dados.evento.ano}`;
    nav.append(titulo);

    const raiz = document.createElement('ul');
    const evento = document.createElement('li');
    evento.append(linkOuTexto('Visão do evento', 'eventos.html', 'evento'));
    const filhosEvento = document.createElement('ul');
    if (dados.evento.ranking_id && await existe(`data/rankings/${dados.evento.ranking_id}/manifest.json`)) {
      const itemRanking = document.createElement('li');
      itemRanking.append(linkOuTexto('Ranking do evento', `ranking.html?ranking=${dados.evento.ranking_id}`, `ranking:${dados.evento.ranking_id}`));
      filhosEvento.append(itemRanking);
    }

    for (const etapa of dados.etapas || []) {
      const itemEtapa = document.createElement('li');
      const filhosEtapa = document.createElement('ul');
      let destinoEtapa = null;
      if (etapa.ranking_id && await existe(`data/rankings/${etapa.ranking_id}/manifest.json`)) {
        destinoEtapa = {
          texto: `Ranking · ${etapa.nome}`,
          href: `ranking.html?ranking=${etapa.ranking_id}`,
          ativa: `ranking:${etapa.ranking_id}`,
        };
      } else if (etapa.inscricoes?.arquivo && await existe(`data/${etapa.inscricoes.arquivo}`)) {
        destinoEtapa = {
          texto: `Inscritos · ${etapa.nome}`,
          href: `inscricoes.html?etapa=${etapa.numero}`,
          ativa: `inscricoes:${etapa.numero}`,
        };
      }
      itemEtapa.append(destinoEtapa
        ? linkOuTexto(destinoEtapa.texto, destinoEtapa.href, destinoEtapa.ativa)
        : textoInativo(etapa.nome));

      for (const prova of etapa.provas || []) {
        const itemProva = document.createElement('li');
        const resultados = prova.resultados && await existe(`data/${prova.resultados}`);
        const labelProva = prova.nome || prova.tipo || `Prova ${prova.id}`;
        itemProva.append(resultados
          ? linkOuTexto(labelProva, `resultados.html?prova=${prova.id}`, `prova:${prova.id}`)
          : textoInativo(labelProva));
        filhosEtapa.append(itemProva);
      }
      itemEtapa.append(filhosEtapa);
      filhosEvento.append(itemEtapa);
    }
    evento.append(filhosEvento);
    raiz.append(evento);
    nav.append(raiz);
    aside.replaceChildren(nav);
  } catch (_) {
    aside.innerHTML = '<p class="tree-error">Navegação do evento indisponível.</p>';
  }
}

function linkOuTexto(texto, href, chave) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = texto;
  if (paginaAtual() === chave) link.setAttribute('aria-current', 'page');
  return link;
}

function textoInativo(texto) {
  const span = document.createElement('span');
  span.className = 'tree-inactive';
  span.textContent = texto;
  return span;
}

function paginaAtual() {
  const params = new URLSearchParams(location.search);
  const pagina = location.pathname.split('/').pop();
  if (pagina === 'ranking.html') return `ranking:${params.get('ranking') || ''}`;
  if (pagina === 'resultados.html') return `prova:${params.get('prova') || ''}`;
  if (pagina === 'inscricoes.html') return `inscricoes:${params.get('etapa') || ''}`;
  return 'evento';
}

async function existe(url) {
  try { return (await fetch(url, { method: 'HEAD' })).ok; } catch (_) { return false; }
}

carregarArvoreEvento();
