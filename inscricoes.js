let evento;
let inscricoes = [];
let provas = [];

async function iniciarInscricoes() {
  const lista = document.querySelector('#registrations-list');
  try {
    const manifestoResposta = await fetch('data/evento.json');
    if (!manifestoResposta.ok) throw new Error('O manifesto do evento não foi encontrado.');
    evento = await manifestoResposta.json();
    const numeroEtapa = Number(new URLSearchParams(location.search).get('etapa') || 3);
    const etapa = evento.etapas.find((item) => item.numero === numeroEtapa);
    if (!etapa) throw new Error(`A etapa ${numeroEtapa} não está configurada.`);
    const arquivo = etapa.inscricoes?.arquivo || `etapas/${etapa.numero}/inscricoes.csv`;
    provas = etapa.provas || [];
    document.querySelector('#registration-event').textContent = `${evento.evento.sigla} · ${evento.evento.ano}`;
    document.querySelector('#registration-title').textContent = `Inscritos · ${etapa.nome}`;
    const resposta = await fetch(`data/${arquivo}`);
    if (!resposta.ok) throw new Error('O arquivo de inscrições ainda não foi publicado.');
    inscricoes = lerCsv(await resposta.text());
    document.querySelector('#registration-summary').textContent = `${inscricoes.length} inscrições · ${provas.length} provas`;
    renderizarInscricoes();
  } catch (erro) {
    lista.innerHTML = `<div class="loading">${escapar(erro.message)}</div>`;
  }
}

function renderizarInscricoes() {
  const agrupamento = document.querySelector('#registration-grouping').value;
  const atletas = new Map();
  for (const row of inscricoes) {
    const id = row.atleta_id || row.atleta;
    if (!atletas.has(id)) atletas.set(id, { ...row, categorias: new Set(), provas: new Map() });
    const item = atletas.get(id);
    if (row.categoria) item.categorias.add(row.categoria);
    item.provas.set(String(row.prova_id || row.fonte_id), row.partida || 'X');
  }
  const registros = Array.from(atletas.values()).map((item) => ({ ...item, categoria: [...item.categorias].sort(ordenar).join(' / ') }))
    .sort((a, b) => ordenar(a.atleta, b.atleta));
  document.querySelector('#registration-summary').textContent = `${registros.length} atletas inscritos · ${provas.length} provas`;
  const grupos = new Map();
  for (const registro of registros) {
    const nome = agrupamento === 'entity' ? registro.entidade_sigla || registro.entidade || 'Sem entidade'
      : agrupamento === 'category' ? registro.categoria || 'Sem categoria' : '';
    if (!grupos.has(nome)) grupos.set(nome, []);
    grupos.get(nome).push(registro);
  }
  const fragment = document.createDocumentFragment();
  for (const nome of [...grupos.keys()].sort(ordenar)) {
    if (agrupamento !== 'none') {
      const h = document.createElement('h2'); h.className = 'registration-group-title'; h.textContent = `${nome} · ${grupos.get(nome).length}`; fragment.append(h);
    }
    const scroll = document.createElement('div'); scroll.className = 'table-scroll';
    const table = document.createElement('table'); table.className = 'registration-table';
    const head = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const nomeColuna of ['Atleta', 'Peitoral', 'Categoria', 'Entidade', 'SiCard', ...provas.map((p) => p.nome || p.tipo)]) {
      const th = document.createElement('th'); th.textContent = nomeColuna; trh.append(th);
    }
    head.append(trh);
    const body = document.createElement('tbody');
    for (const atleta of grupos.get(nome).sort((a, b) => ordenar(a.atleta, b.atleta))) {
      const tr = document.createElement('tr');
      for (const valor of [atleta.atleta, atleta.peitoral, atleta.categoria, atleta.entidade_sigla || atleta.entidade, atleta.sicard]) {
        const td = document.createElement('td'); td.textContent = valor || '—'; tr.append(td);
      }
      for (const prova of provas) {
        const td = document.createElement('td');
        const partida = atleta.provas.get(String(prova.id));
        td.textContent = partida || '—';
        if (partida) { td.className = 'registration-mark'; td.title = partida === 'X' ? 'Inscrito, sem horário de partida' : `Partida: ${partida}`; }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(head, body); scroll.append(table); fragment.append(scroll);
  }
  document.querySelector('#registrations-list').replaceChildren(fragment);
}

function lerCsv(texto) {
  const linhas = []; let linha = []; let campo = ''; let aspas = false;
  texto.replace(/^\uFEFF/, '').split('').forEach((c, i, chars) => {
    if (aspas) { if (c === '"' && chars[i + 1] === '"') { campo += '"'; chars[i + 1] = ''; } else if (c === '"') aspas = false; else campo += c; }
    else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && chars[i + 1] === '\n') chars[i + 1] = ''; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  });
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  if (!linhas.length) return [];
  const keys = linhas.shift().map((key) => key.trim());
  return linhas.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] || ''])));
}

function ordenar(a, b) { return String(a || '').localeCompare(String(b || ''), 'pt-BR'); }
function escapar(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
document.querySelector('#registration-grouping').addEventListener('change', renderizarInscricoes);
iniciarInscricoes();
