const DATA_DIR = 'data/';
const rankingId = new URLSearchParams(window.location.search).get('ranking');
let rankingDir = '';
const state = {
  manifest: null,
  rows: [],
  futureRows: [],
  futureByKey: new Map(),
  discardCount: 0,
  bonusMinimum: 0,
  showFuture: false,
};

const elements = {
  event: document.querySelector('#event-name'),
  title: document.querySelector('#ranking-title'),
  status: document.querySelector('#ranking-status'),
  updated: document.querySelector('#updated-at'),
  controls: document.querySelector('#controls'),
  discardControl: document.querySelector('#discard-control'),
  discardRange: document.querySelector('#discard-range'),
  discardValue: document.querySelector('#discard-value'),
  discardTicks: document.querySelector('#discard-ticks'),
  bonusControl: document.querySelector('#bonus-control'),
  bonusRange: document.querySelector('#bonus-range'),
  bonusValue: document.querySelector('#bonus-value'),
  bonusTicks: document.querySelector('#bonus-ticks'),
  futureControl: document.querySelector('#future-control'),
  showFuture: document.querySelector('#show-future'),
  search: document.querySelector('#search'),
  list: document.querySelector('#ranking-list'),
  empty: document.querySelector('#empty-state'),
  count: document.querySelector('#result-count'),
  averageLegend: document.querySelector('#average-legend'),
};

async function carregar() {
  try {
    let id = rankingId;
    if (!id) {
      const eventResponse = await fetch(`${DATA_DIR}evento.json`);
      if (!eventResponse.ok) throw new Error('O manifesto do evento não foi encontrado.');
      const eventData = await eventResponse.json();
      id = eventData.evento.ranking_id;
    }
    rankingDir = `${DATA_DIR}rankings/${encodeURIComponent(id)}/`;
    const manifestResponse = await fetch(`${rankingDir}manifest.json`);
    if (!manifestResponse.ok) throw new Error('Os arquivos de dados do ranking não foram encontrados.');
    state.manifest = await manifestResponse.json();
    const arquivoInscricoes = state.manifest.inscricoes_futuras?.arquivo || 'etapas/3/inscricoes.csv';
    const [csvResponse, futureCsv] = await Promise.all([
      fetch(`${rankingDir}ranking.csv`),
      fetch(`${DATA_DIR}${arquivoInscricoes}`).catch(() => null),
    ]);
    if (!csvResponse.ok) {
      throw new Error('Os arquivos de dados do ranking não foram encontrados.');
    }

    state.rows = objetosCsv(await csvResponse.text());
    if (futureCsv?.ok) {
      state.futureRows = objetosCsv(await futureCsv.text());
    }
    prepararInscricoesFuturas();
    elements.averageLegend.hidden = !state.rows.some((linha) =>
      state.manifest.fontes.some((fonte) => linha[`fonte_${fonte.id}_media`] === 'true'),
    );
    prepararCabecalho();
    prepararControles();
    renderizar();
  } catch (error) {
    const mensagem = window.location.protocol === 'file:'
      ? 'O navegador bloqueia a leitura dos CSVs quando a página é aberta como arquivo local. Inicie um servidor nesta pasta com “python -m http.server 8000” e abra http://localhost:8000/ranking.html.'
      : `Não foi possível carregar os dados: ${error.message}`;
    elements.list.innerHTML = `<div class="card loading">${escapar(mensagem)}</div>`;
  }
}

function objetosCsv(texto) {
  const linhas = analisarCsv(texto.replace(/^\uFEFF/, ''));
  if (linhas.length < 2) return [];
  const cabecalhos = linhas[0].map((item) => item.trim());
  return linhas.slice(1)
    .filter((linha) => linha.some((valor) => valor !== ''))
    .map((linha) => Object.fromEntries(cabecalhos.map((chave, indice) => [chave, linha[indice] ?? ''])));
}

function analisarCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let entreAspas = false;
  for (let indice = 0; indice < texto.length; indice++) {
    const caractere = texto[indice];
    if (entreAspas) {
      if (caractere === '"' && texto[indice + 1] === '"') {
        campo += '"';
        indice++;
      } else if (caractere === '"') {
        entreAspas = false;
      } else {
        campo += caractere;
      }
    } else if (caractere === '"') {
      entreAspas = true;
    } else if (caractere === ',') {
      linha.push(campo);
      campo = '';
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && texto[indice + 1] === '\n') indice++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

function prepararInscricoesFuturas() {
  for (const inscricao of state.futureRows) {
    const chave = chaveParticipante(inscricao.categoria_id, inscricao.atleta_id);
    if (!state.futureByKey.has(chave)) {
      state.futureByKey.set(chave, { dados: inscricao, fontes: new Set() });
    }
    const fonteId = fonteIdDaInscricao(inscricao);
    if (fonteId !== null) state.futureByKey.get(chave).fontes.add(fonteId);
  }
}

function prepararCabecalho() {
  const meta = state.manifest;
  elements.event.textContent = meta.ranking.evento || 'Ranking';
  elements.title.textContent = meta.ranking.nome;
  elements.status.textContent = meta.parcial
    ? `Ranking parcial · ${meta.fontes_apuradas}/${meta.fontes_esperadas} competições apuradas`
    : `${meta.fontes_apuradas} competições apuradas`;
  const data = new Date(meta.gerado_em);
  elements.updated.textContent = Number.isNaN(data.valueOf())
    ? meta.gerado_em
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

function prepararControles() {
  const meta = state.manifest;
  const configuracao = meta.configuracao_apresentacao || {};
  const descarte = configuracao.descartes || {};
  const qtdDescartes = inteiro(descarte.quantidade) ?? 0;
  const fontesFuturas = meta.fontes.filter((fonte) => !fonte.apurada);
  const temFuturas = state.futureRows.length > 0 && fontesFuturas.length > 0;
  const extra = configuracao.pontuacao_extra || {};
  const qtdExtra = primeiroNumero(extra, [
    'quantidade_participacoes', 'qtd_participacoes', 'qtd_fontes_participacao', 'quantidade_fontes', 'quantidade',
  ]);
  const pontosExtra = primeiroNumero(extra, ['pontos', 'valor', 'bonus']);
  const temExtra = meta.tem_extra && pontosExtra !== null;

  if (!meta.parcial || (qtdDescartes === 0 && !temExtra && !temFuturas)) return;
  elements.controls.hidden = false;

  if (meta.parcial && meta.tem_descarte && qtdDescartes > 0) {
    elements.discardControl.hidden = false;
    elements.discardRange.max = String(qtdDescartes);
    elements.discardRange.value = '0';
    state.discardCount = 0;
    elements.discardTicks.innerHTML = Array.from({ length: qtdDescartes + 1 }, (_, valor) => `<span>${valor}</span>`).join('');
    elements.discardRange.addEventListener('input', () => {
      state.discardCount = Number(elements.discardRange.value);
      elements.discardValue.value = String(state.discardCount);
      renderizar();
    });
    elements.discardValue.value = '0';
  }

  if (temExtra) {
    elements.bonusControl.hidden = false;
    const inicial = qtdExtra ?? 0;
    elements.bonusRange.max = String(meta.fontes_esperadas);
    elements.bonusRange.value = String(Math.min(inicial, meta.fontes_esperadas));
    state.bonusMinimum = Number(elements.bonusRange.value);
    elements.bonusValue.value = `${state.bonusMinimum} participações`;
    elements.bonusTicks.innerHTML = Array.from({ length: meta.fontes_esperadas + 1 }, (_, valor) => `<span>${valor}</span>`).join('');
    elements.bonusRange.addEventListener('input', () => {
      state.bonusMinimum = Number(elements.bonusRange.value);
      elements.bonusValue.value = `${state.bonusMinimum} participações`;
      renderizar();
    });
  }

  if (temFuturas) {
    elements.futureControl.hidden = false;
    elements.showFuture.addEventListener('change', () => {
      state.showFuture = elements.showFuture.checked;
      renderizar();
    });
  }
}

function renderizar() {
  const meta = state.manifest;
  const fontesVisiveis = meta.fontes.filter((fonte) => fonte.apurada || state.showFuture);
  const categorias = meta.categorias.slice().sort((a, b) => a.ordem - b.ordem);
  const busca = normalizar(elements.search.value);
  let contagemVisivel = 0;
  const fragmento = document.createDocumentFragment();

  for (const categoria of categorias) {
    const itensBase = state.rows
      .filter((linha) => inteiro(linha.categoria_id) === Number(categoria.id))
      .map((linha) => prepararItem(linha, fontesVisiveis));
    const chavesBase = new Set(itensBase.map((item) => chaveParticipante(item.linha.categoria_id, item.linha.atleta_id)));
    const futuros = state.showFuture
      ? Array.from(state.futureByKey.entries())
          .filter(([chave]) => chave.startsWith(`${categoria.id}:`) && !chavesBase.has(chave))
          .map(([, registro]) => prepararItemFuturo(registro, fontesVisiveis))
      : [];
    let itens = [...itensBase, ...futuros];

    if (meta.parcial) {
      const classificados = itens.filter((item) => !item.futuro)
        .sort((a, b) => b.total - a.total || a.linha.atleta.localeCompare(b.linha.atleta, 'pt-BR'));
      atribuirPosicoes(classificados);
      itens = [...classificados, ...itens.filter((item) => item.futuro)
        .sort((a, b) => a.linha.atleta.localeCompare(b.linha.atleta, 'pt-BR'))];
    }

    const itensFiltrados = itens.filter((item) => {
      const texto = normalizar(`${categoria.nome} ${item.linha.atleta} ${item.linha.entidade_sigla} ${item.linha.entidade}`);
      return !busca || texto.includes(busca);
    });
    if (itensFiltrados.length === 0) continue;
    contagemVisivel += itensFiltrados.length;

    const secao = document.createElement('section');
    secao.className = 'category-card card';
    const cabecalho = document.createElement('div');
    cabecalho.className = 'category-heading';
    cabecalho.innerHTML = `<h2>${escapar(categoria.nome)}</h2><span>${itensFiltrados.length} ${itensFiltrados.length === 1 ? 'atleta' : 'atletas'}</span>`;
    secao.append(cabecalho, montarTabela(itensFiltrados, fontesVisiveis, meta));
    fragmento.append(secao);
  }

  elements.list.replaceChildren(fragmento);
  elements.empty.hidden = contagemVisivel > 0;
  elements.count.textContent = `${contagemVisivel} ${contagemVisivel === 1 ? 'atleta' : 'atletas'}`;
}

function prepararItem(linha, fontesVisiveis) {
  const meta = state.manifest;
  const fontesCorridas = meta.fontes.filter((fonte) => fonte.apurada);
  const configuracao = meta.configuracao_apresentacao || {};
  const configDescarte = configuracao.descartes || {};
  const configExtra = configuracao.pontuacao_extra || {};
  const protegidas = new Set((configDescarte.fontes_nao_descartaveis || []).map(Number));
  const participacoes = inteiro(linha.fontes_participadas) ?? 0;
  const mediaParticipacoes = configuracao.incluir_medias_na_participacao_extra
    ? fontesCorridas.filter((fonte) => linha[`fonte_${fonte.id}_media`] === 'true').length
    : 0;
  const pontuacoes = fontesCorridas.map((fonte) => ({
    fonte,
    pontos: numero(linha[`fonte_${fonte.id}_pontuacao`]) ?? 0,
  }));
  const parcial = arredondar(pontuacoes.reduce((soma, item) => soma + item.pontos, 0));
  const elegiveis = pontuacoes.filter((item) => !protegidas.has(Number(item.fonte.id)));
  const descartarMaiores = String(configDescarte.tipo || '').toLowerCase().includes('maiores');
  elegiveis.sort((a, b) => descartarMaiores ? b.pontos - a.pontos : a.pontos - b.pontos);
  const quantidade = Math.min(state.discardCount, elegiveis.length);
  let descartadas;
  if (String(configDescarte.tipo || '').toLowerCase().includes('maior e menor')) {
    const metade = Math.floor(quantidade / 2);
    descartadas = [...elegiveis.slice(0, metade), ...elegiveis.slice(-metade).reverse()];
  } else {
    descartadas = elegiveis.slice(0, quantidade);
  }
  const descarte = arredondar(descartadas.reduce((soma, item) => soma + item.pontos, 0));
  const extraAtivo = meta.tem_extra && Object.keys(configExtra).length > 0;
  const pontosExtra = extraAtivo && participacoes + mediaParticipacoes >= state.bonusMinimum
    ? primeiroNumero(configExtra, ['pontos', 'valor', 'bonus']) ?? 0
    : 0;
  const total = arredondar(parcial - (meta.tem_descarte ? descarte : 0) + pontosExtra);
  const chave = chaveParticipante(linha.categoria_id, linha.atleta_id);
  const futuras = state.futureByKey.get(chave)?.fontes ?? new Set();
  return {
    linha,
    futuro: false,
    posicao: meta.parcial ? null : inteiro(linha.posicao),
    empate: meta.parcial ? false : linha.empatados === 'true',
    participacoes,
    parcial,
    descarte: meta.tem_descarte ? descarte : null,
    extra: extraAtivo ? pontosExtra : null,
    total: meta.parcial ? total : numero(linha.pontuacao_final) ?? 0,
    pontosPorFonte: new Map(fontesVisiveis.map((fonte) => [Number(fonte.id), {
      pontos: numero(linha[`fonte_${fonte.id}_pontuacao`]),
      media: linha[`fonte_${fonte.id}_media`] === 'true',
      inscritoFuturo: futuras.has(Number(fonte.id)),
    }])),
  };
}

function prepararItemFuturo(registro, fontesVisiveis) {
  const fontesFuturas = new Set(Array.from(registro.fontes));
  const linha = registro.dados;
  return {
    linha: {
      ...linha,
      atleta_id: linha.atleta_id,
      atleta: linha.atleta || '',
      entidade_sigla: linha.entidade_sigla || '',
      entidade: linha.entidade || '',
    },
    futuro: true,
    posicao: null,
    empate: false,
    participacoes: 0,
    parcial: null,
    descarte: null,
    extra: null,
    total: null,
    pontosPorFonte: new Map(fontesVisiveis.map((fonte) => [Number(fonte.id), {
      pontos: null,
      media: false,
      inscritoFuturo: fontesFuturas.has(Number(fonte.id)),
    }])),
  };
}

function atribuirPosicoes(itens) {
  let anterior = null;
  let posicaoAnterior = null;
  for (let indice = 0; indice < itens.length; indice++) {
    const pontos = arredondar(itens[indice].total);
    const empatado = anterior !== null && pontos === anterior;
    itens[indice].posicao = empatado ? posicaoAnterior : indice + 1;
    itens[indice].empate = empatado || (indice + 1 < itens.length && arredondar(itens[indice + 1].total) === pontos);
    if (!empatado) posicaoAnterior = indice + 1;
    anterior = pontos;
  }
}

function montarTabela(itens, fontes, meta) {
  const colunas = [
    ['Pos.', 'position'], ['Atleta', 'athlete'], ['Entidade', 'entity'],
    ...fontes.map((fonte) => [fonte.nome, `source-${fonte.id}`]),
    ...(meta.tem_descarte || meta.tem_extra ? [['Parcial', 'partial']] : []),
    ...(meta.tem_descarte ? [['Descarte', 'discard']] : []),
    ...(meta.tem_extra ? [['Extra', 'extra']] : []), ['Total', 'total'],
  ];
  const wrapper = document.createElement('div');
  wrapper.className = 'table-scroll';
  const tabela = document.createElement('table');
  const thead = document.createElement('thead');
  const linhaCabecalho = document.createElement('tr');
  for (const [titulo, tipo] of colunas) {
    const th = document.createElement('th');
    th.textContent = titulo;
    if (tipo === 'athlete') th.className = 'athlete';
    linhaCabecalho.append(th);
  }
  thead.append(linhaCabecalho);
  const tbody = document.createElement('tbody');
  for (const item of itens) {
    const tr = document.createElement('tr');
    if (item.futuro) tr.className = 'future-row';
    for (const [, tipo] of colunas) {
      const td = document.createElement('td');
      if (tipo === 'position') {
        td.innerHTML = item.posicao === null
          ? '—'
          : `${item.posicao}${item.empate ? '<br><span class="position-tie">Empate</span>' : ''}`;
      } else if (tipo === 'athlete') {
        td.className = 'athlete';
        td.textContent = item.linha.atleta || '—';
        if (item.linha.pais_sigla) {
          const pais = document.createElement('span');
          pais.className = 'country';
          pais.textContent = item.linha.pais_sigla;
          td.append(pais);
        }
      } else if (tipo === 'entity') {
        td.className = 'entity';
        const sigla = item.linha.entidade_sigla || item.linha.entidade || '—';
        td.innerHTML = `<span class="entity-name" title="${escapar(item.linha.entidade || sigla)}">${escapar(sigla)}</span>`;
      } else if (tipo.startsWith('source-')) {
        const fonteId = Number(tipo.substring('source-'.length));
        const contribuicao = item.pontosPorFonte.get(fonteId);
        if (contribuicao?.inscritoFuturo) {
          td.innerHTML = '<span class="future-mark" title="Inscrito para esta competição">X</span>';
        } else if (contribuicao?.pontos !== null && contribuicao?.pontos !== undefined) {
          td.textContent = formatarNumero(contribuicao.pontos);
          if (contribuicao.media) {
            td.classList.add('average');
            td.title = 'Pontuação calculada por média';
          }
        } else {
          td.textContent = '—';
        }
      } else if (tipo === 'partial') {
        td.textContent = item.futuro ? '' : formatarNumero(item.parcial);
      } else if (tipo === 'discard') {
        td.textContent = item.futuro ? '' : formatarNumero(item.descarte);
      } else if (tipo === 'extra') {
        td.textContent = item.futuro ? '' : formatarNumero(item.extra);
      } else if (tipo === 'total') {
        td.className = 'total';
        td.textContent = item.futuro ? '' : formatarNumero(item.total);
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  tabela.append(thead, tbody);
  wrapper.append(tabela);
  return wrapper;
}

function chaveParticipante(categoriaId, atletaId) {
  return `${inteiro(categoriaId) ?? ''}:${inteiro(atletaId) ?? ''}`;
}

function fonteIdDaInscricao(inscricao) {
  const fontes = state.manifest?.fontes ?? [];
  const fonteInformada = inteiro(inscricao.fonte_id);
  if (fonteInformada !== null && fontes.some((fonte) => Number(fonte.id) === fonteInformada)) {
    return fonteInformada;
  }
  const provaId = inteiro(inscricao.prova_id);
  if (provaId !== null) {
    const fonte = fontes.find((item) => Number(item.prova_id) === provaId);
    if (fonte) return Number(fonte.id);
  }
  return null;
}

function primeiroNumero(objeto, chaves) {
  for (const chave of chaves) {
    const valor = numero(objeto?.[chave]);
    if (valor !== null) return valor;
  }
  return null;
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const resultado = Number(String(valor).replace(',', '.'));
  return Number.isFinite(resultado) ? resultado : null;
}

function inteiro(valor) {
  const resultado = Number.parseInt(valor, 10);
  return Number.isInteger(resultado) ? resultado : null;
}

function arredondar(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]);
}

elements.search.addEventListener('input', renderizar);
carregar();
