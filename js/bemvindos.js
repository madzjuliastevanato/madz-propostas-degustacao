(function () {
  const CONFIG = window.MADZ_CONFIG;
  const calc = window.MADZ_CALC;
  const state = window.MADZ_STATE;
  const proposta = window.MADZ_PROPOSTA;
  const canal = state.criarCanalBemVindos();

  const elementoNome = document.getElementById("nome-casal");
  const conteudoBemVindos = document.getElementById("conteudo-bemvindos");
  const vistaApresentacao = document.getElementById("vista-apresentacao");
  const botaoTelaCheia = document.getElementById("botao-tela-cheia");

  function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function renderizarResumo(estado) {
    const dados = proposta.dadosResumo(estado);
    const c = dados.cabecalho;

    const drinksHtml = dados.drinks.length
      ? `<ul>${dados.drinks.map((d) => `<li>${escaparHtml(d.nome)}${d.autoral ? " (autoral)" : ""}</li>`).join("")}</ul>`
      : `<p class="apresentacao-vazio">A combinar na degustação.</p>`;
    const caipirinhasHtml = dados.caipirinhas.length
      ? `<ul>${dados.caipirinhas.map((cp) => `<li>${escaparHtml(cp)}</li>`).join("")}</ul>`
      : `<p class="apresentacao-vazio">A combinar na degustação.</p>`;

    vistaApresentacao.innerHTML = `
      <div class="apresentacao-cabecalho">
        <span class="apresentacao-casal">${escaparHtml(c.nomeCasal || "")}</span>
        <h2 class="apresentacao-pacote-nome">Resumo do evento</h2>
      </div>
      <div class="resumo-grid">
        <div><span>Local</span><strong>${escaparHtml(c.local || "—")}</strong></div>
        <div><span>Data do evento</span><strong>${c.dataEvento ? proposta.formatarDataBr(c.dataEvento) : "—"}</strong></div>
        <div><span>Convidados</span><strong>${c.convidados}</strong></div>
        <div><span>Tempo de serviço</span><strong>${c.tempoServicoHoras}h</strong></div>
        <div><span>Assessoria</span><strong>${escaparHtml(c.assessoria || "—")}</strong></div>
      </div>
      <div class="resumo-colunas">
        <div class="bloco-tv"><h3>Drinks escolhidos</h3>${drinksHtml}</div>
        <div class="bloco-tv"><h3>Caipirinhas escolhidas</h3>${caipirinhasHtml}</div>
      </div>
    `;
  }

  function renderizarPacote(estado, idPacote) {
    const dados = proposta.dadosPacote(estado, idPacote);

    const blocoCortesias =
      dados.cortesias.length && dados.cortesiasReveladas
        ? `
        <h3 class="apresentacao-secao-titulo">Cortesias</h3>
        <div class="apresentacao-cortesias">${dados.cortesias.map((c) => `<span class="cortesia-chip-tv">${escaparHtml(c.nome)}</span>`).join("")}</div>`
        : "";

    let blocoValores;
    if (dados.valoresRevelados) {
      const colunas = dados.tipos
        .map((tipo) => {
          const valorAjustado = dados.linhas[0].porTipo[tipo.id].valorAjustado;
          const linhas = dados.linhas
            .map((linha) => {
              const resultado = linha.porTipo[tipo.id];
              const detalhe = `<span class="detalhe-tv">${resultado.aviso || resultado.detalhe}</span>`;
              const total = resultado.aviso ? "" : `<span class="total-tv">${calc.formatarMoeda(resultado.totalComDesconto)}</span>`;
              return `
                <div class="linha-opcao-tv">
                  <div class="linha-opcao-tv-topo">
                    <span class="nome-opcao-tv">${linha.opcao.nome}</span>
                    ${total}
                  </div>
                  ${detalhe}
                </div>`;
            })
            .join("");
          const marcas = CONFIG.rotulosBebidas[tipo.id];
          return `
            <div class="coluna-tipo-tv">
              <div class="coluna-tipo-tv-cabecalho">
                <div class="tipo-nome-tv">${tipo.nome}</div>
                <div class="valor-convidado-tv">${calc.formatarMoeda(valorAjustado, { comCentavos: true })} / convidado</div>
                ${marcas ? `<div class="marcas-tv">${marcas}</div>` : ""}
              </div>
              ${linhas}
            </div>`;
        })
        .join('<div class="divisor-coluna-tv"></div>');
      blocoValores = `<div class="colunas-pagamento-tv">${colunas}</div>`;
    } else {
      blocoValores = `<p class="apresentacao-aguardando">Valores e formas de pagamento</p>`;
    }

    vistaApresentacao.innerHTML = `
      <div class="apresentacao-cabecalho">
        <span class="apresentacao-casal">${escaparHtml(estado.cabecalho.nomeCasal || "")}</span>
        <h2 class="apresentacao-pacote-nome">${dados.nome}</h2>
        <p class="apresentacao-pacote-descricao">${dados.descricaoCurta}</p>
      </div>
      ${blocoCortesias}
      ${blocoValores}
    `;
  }

  function aplicar(dados) {
    if (!dados) return;

    if (dados.tipo === "apresentacao" && dados.modo === "espelho" && dados.estado) {
      if (dados.pacoteAtivo === "resumo" || !CONFIG.pacotes[dados.pacoteAtivo]) {
        renderizarResumo(dados.estado);
      } else {
        renderizarPacote(dados.estado, dados.pacoteAtivo);
      }
      conteudoBemVindos.classList.add("oculto");
      vistaApresentacao.classList.remove("oculto");
      document.body.classList.add("modo-apresentacao");
      return;
    }

    document.body.classList.remove("modo-apresentacao");
    if (typeof dados.nomeCasal === "string") {
      elementoNome.textContent = dados.nomeCasal.trim() || "Bem-vindos";
    }
    conteudoBemVindos.classList.remove("oculto");
    vistaApresentacao.classList.add("oculto");
  }

  aplicar(canal.estadoInicial());
  canal.escutar(aplicar);

  function tentarTelaCheia() {
    const elemento = document.documentElement;
    const pedido = elemento.requestFullscreen || elemento.webkitRequestFullscreen;
    if (pedido) {
      pedido.call(elemento).catch(() => {});
    }
  }

  botaoTelaCheia.addEventListener("click", tentarTelaCheia);
  window.addEventListener("load", tentarTelaCheia);
})();
