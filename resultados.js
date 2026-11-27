let resultadosPublicados = [];
let provaPorPontos = false;
const areaResultados = document.querySelector('#proof-results');

async function iniciarResultados() {
  try {
    const id = new URLSearchParams(location.search).get('prova');
    const manifestoResposta = await fetch('data/evento.json');
    if (!id || !manifestoResposta.ok) throw new Error('Não foi possível identificar a prova.');
    const manifesto = await manifestoResposta.json();
    const prova = manifesto.etapas.flatMap((etapa) => etapa.provas.map((p) => ({ ...p, etapa }))).find((p) => String(p.id) === id);
    if (!prova) throw new Error('A prova não consta no evento publicado.');
    document.querySelector('#proof-event').textContent = `${manifesto.evento.sigla} · ${manifesto.evento.ano} · ${prova.etapa.nome}`;
    document.querySelector('#proof-title').textContent = `Resultados · ${prova.nome || prova.tipo}`;
    document.querySelector('#proof-subtitle').textContent = `${prova.nome || prova.tipo}${prova.data ? ` · ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(prova.data))}` : ''}`;
    const resposta = await fetch(`data/${prova.resultados}`);
    if (!resposta.ok) throw new Error('O CSV de resultados desta prova ainda não foi publicado.');
    const rows = parseCsv(await resposta.text());
    resultadosPublicados = rows;
    provaPorPontos = Boolean(prova.por_pontos);
    renderizar();
  } catch (erro) { areaResultados.innerHTML = `<div class="card loading">${escapar(erro.message)}</div>`; }
}

function renderizar() {
  const busca = normalizar(document.querySelector('#proof-search').value);
  const rows = resultadosPublicados.filter((row) => !busca || normalizar([
    row.categoria, row.atleta, row.entidade_sigla, row.entidade, row.peitoral, row.situacao_sigla,
  ].join(' ')).includes(busca));
  document.querySelector('#proof-count').textContent = `${rows.length} ${rows.length === 1 ? 'atleta' : 'atletas'}`;
  const empty = document.querySelector('#proof-empty');
  empty.hidden = rows.length > 0;
  if (!rows.length) { areaResultados.replaceChildren(); return; }
  const grupos = new Map();
  for (const row of rows) {
    const id = row.categoria_id || row.categoria || 'sem-categoria';
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(row);
  }
  const section = document.createDocumentFragment();
  for (const group of [...grupos.values()].sort((a, b) => (Number(a[0].categoria_ordem) || 9999) - (Number(b[0].categoria_ordem) || 9999))) {
    const base = group[0];
    const card = document.createElement('section'); card.className = 'result-category card';
    const header = document.createElement('div'); header.className = 'result-category-heading';
    const details = [base.percurso, base.distancia_m ? `↔ ${formatDistance(base.distancia_m)} km` : '', base.desnivel_m ? `▲ ${base.desnivel_m} m` : ''].filter(Boolean).join(' · ');
    header.innerHTML = `<div><h2>${escapar(base.categoria || 'Sem categoria')}${details ? ` <span>${escapar(details)}</span>` : ''}</h2></div><span class="result-athlete-count">${group.length} ${group.length === 1 ? 'atleta' : 'atletas'}</span>`;
    const scroll = document.createElement('div'); scroll.className = 'table-scroll';
    const table = document.createElement('table'); table.className = 'public-result-table';
    const headers = ['Pos.', 'Atleta', 'Peitoral', 'Entidade', ...(provaPorPontos ? ['Pontos'] : ['Tempo', 'min/km', 'Diferença'])];
    const thead = document.createElement('thead'); const trh = document.createElement('tr');
    headers.forEach((name) => { const th = document.createElement('th'); th.textContent = name; if (name === 'Atleta') th.className = 'athlete'; trh.append(th); }); thead.append(trh);
    const body = document.createElement('tbody');
    for (const row of group) {
      const tr = document.createElement('tr');
      const situacao = row.situacao_sigla || '';
      const posicao = situacao && situacao !== 'OK' ? situacao : row.posicao || '—';
      const ajuste = getAjusteTooltip(row.ajustes_json);
      const values = [posicao, row.atleta || '', row.peitoral || '—', row.entidade_sigla || '—', ...(provaPorPontos ? [row.pontos ?? '—'] : [formatTime(row.tempo_segundos), formatPace(row.tempo_segundos, row.distancia_m), row.diferenca || '—'])];
      values.forEach((value, index) => {
        const td = document.createElement('td'); td.textContent = String(value ?? '—');
        if (index === 1) { td.className = 'athlete'; if (ajuste) { td.title = ajuste; td.classList.add('has-adjustment'); } }
        tr.append(td);
      });
      body.append(tr);
    }
    table.append(thead, body); scroll.append(table); card.append(header, scroll); section.append(card);
  }
  areaResultados.replaceChildren(section);
}

function parseCsv(text) {
  const records = []; let row = []; let field = ''; let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); records.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  const keys = records.shift()?.map((key) => key.trim()) || [];
  return records.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(keys.map((key, i) => [key, r[i] ?? ''])));
}
function getAjusteTooltip(json) {
  if (!json) return '';
  try { return JSON.parse(json).map((a) => `${a.tipo || 'Ajuste'}: ${a.descricao || ''}`).join('\n'); } catch { return ''; }
}
function formatTime(value) {
  if (value === '' || value == null) return '—';
  let total = Math.max(0, Math.trunc(Number(value)));
  const h = Math.floor(total / 3600); total %= 3600;
  const m = Math.floor(total / 60); const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatPace(seconds, distance) {
  const s = Number(seconds); const m = Number(distance);
  if (!Number.isFinite(s) || !Number.isFinite(m) || s <= 0 || m <= 0) return '—';
  const pace = Math.round(s * 1000 / m); return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')}`;
}
function formatDistance(meters) { return (Number(meters) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }
function normalizar(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function escapar(v) { return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
document.querySelector('#proof-search').addEventListener('input', renderizar);
iniciarResultados();
