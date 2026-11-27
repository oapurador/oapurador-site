async function carregarEvento() {
  const lista = document.querySelector('#stages');
  try {
    const resposta = await fetch('data/evento.json');
    if (!resposta.ok) throw new Error('O manifesto do evento não foi encontrado.');
    const dados = await resposta.json();
    const evento = dados.evento;
    document.querySelector('#event-title').textContent = evento.nome;
    document.querySelector('#event-subtitle').textContent = `${evento.sigla} · ${evento.ano}`;
    const ranking = document.querySelector('#event-ranking');
    ranking.href = `ranking.html?ranking=${encodeURIComponent(evento.ranking_id)}`;
    ranking.hidden = false;

    lista.replaceChildren(...await Promise.all(dados.etapas.map((etapa) => montarEtapa(etapa))));
  } catch (erro) {
    lista.innerHTML = `<div class="card loading">${escapar(erro.message)}</div>`;
  }
}

async function montarEtapa(etapa) {
  const card = document.createElement('section');
  card.className = 'stage-card card';
  const topo = document.createElement('div');
  topo.className = 'stage-heading';
  topo.innerHTML = `<div><p class="eyebrow">Etapa ${etapa.numero}</p><h2>${escapar(etapa.nome)}</h2></div>`;
  const acoes = document.createElement('div');
  acoes.className = 'stage-actions';
  const arquivoInscricoes = etapa.inscricoes?.arquivo || `etapas/${etapa.numero}/inscricoes.csv`;
  if (await recursoExiste(`data/${arquivoInscricoes}`)) {
    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = `inscricoes.html?etapa=${encodeURIComponent(etapa.numero)}`;
    link.textContent = `Inscritos · ${etapa.nome}`;
    acoes.append(link);
  } else if (etapa.ranking_id && await recursoExiste(`data/rankings/${encodeURIComponent(etapa.ranking_id)}/manifest.json`)) {
    const link = document.createElement('a');
    link.className = 'text-link';
    link.href = `ranking.html?ranking=${encodeURIComponent(etapa.ranking_id)}`;
    link.textContent = 'Ranking da etapa';
    acoes.append(link);
  }
  if (acoes.childElementCount) topo.append(acoes);
  card.append(topo);

  const provas = document.createElement('div');
  provas.className = 'proof-list';
  for (const prova of etapa.provas || []) {
    const linha = document.createElement('article');
    linha.className = 'proof-row';
    const data = prova.data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(prova.data)) : '';
    const rotulo = prova.nome || prova.tipo || `Prova ${prova.id}`;
    const resultadoExiste = await recursoExiste(`data/${prova.resultados}`);
    const resultado = document.createElement(resultadoExiste ? 'a' : 'span');
    resultado.className = resultadoExiste ? 'text-link' : 'pending-link';
    if (resultadoExiste) resultado.href = `resultados.html?prova=${encodeURIComponent(prova.id)}`;
    resultado.textContent = resultadoExiste ? 'Resultados' : 'Resultados · dados pendentes';
    const info = document.createElement('div');
    info.className = 'proof-info';
    info.innerHTML = `<strong>${escapar(rotulo)}</strong><span>${escapar(prova.tipo || '')}${data ? ` · ${escapar(data)}` : ''}</span>`;
    linha.append(info, resultado);
    provas.append(linha);
  }
  card.append(provas);
  return card;
}

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

async function recursoExiste(url) {
  try { return (await fetch(url, { method: 'HEAD' })).ok; } catch { return false; }
}

carregarEvento();
