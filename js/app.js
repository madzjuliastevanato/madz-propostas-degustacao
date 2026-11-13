(function () {
  const CONFIG = window.MADZ_CONFIG;
  const calc = window.MADZ_CALC;
  const state = window.MADZ_STATE;

  function garantirCamposCompartilhados(alvo) {
    if (!Array.isArray(alvo.drinksSelecionados)) alvo.drinksSelecionados = [];
    if (!Array.isArray(alvo.caipirinhas) || alvo.caipirinhas.length === 0) alvo.caipirinhas = ["", ""];
    return alvo;
  }

  let estado = garantirCamposCompartilhados(state.carregarAtual() || state.criarPadrao());
  const canalBemVindos = state.criarCanalBemVindos();
  const salvarDebounced = state.debounce(() => {
    state.salvarAtual(estado);
    mostrarAvisoSalvamento();
  }, 500);
  const salvarNaListaDebounced = state.debounce(() => state.salvarComoProposta(estado), 1500);

  const proposta = window.MADZ_PROPOSTA;
  const TIPOS_BEBIDA = proposta.TIPOS_BEBIDA;
  const tiposAtivos = proposta.tiposAtivos;
  const formatarDataBr = proposta.formatarDataBr;

  const estadoApresentacao = { modo: "bemvindos", pacoteEmFoco: "resumo" };

  function enviarApresentacaoParaBemVindos() {
    if (estadoApresentacao.modo === "espelho") {
      canalBemVindos.enviar({
        tipo: "apresentacao",
        modo: "espelho",
        nomeCasal: estado.cabecalho.nomeCasal,
        estado: estado,
        pacoteAtivo: estadoApresentacao.pacoteEmFoco,
      });
    } else {
      canalBemVindos.enviar({ tipo: "nome", modo: "bemvindos", nomeCasal: estado.cabecalho.nomeCasal });
    }
  }
  const enviarApresentacaoDebounced = state.debounce(enviarApresentacaoParaBemVindos, 200);

  function persistir() {
    estado.atualizadoEm = new Date().toISOString();
    salvarDebounced();
    if (estado.cabecalho.nomeCasal) salvarNaListaDebounced();
    if (estadoApresentacao.modo === "espelho") enviarApresentacaoDebounced();
  }

  function mostrarAvisoSalvamento() {
    const aviso = document.getElementById("aviso-salvamento");
    if (!aviso) return;
    aviso.textContent = "Salvo " + new Date().toLocaleTimeString("pt-BR").slice(0, 5);
    aviso.classList.add("visivel");
    clearTimeout(mostrarAvisoSalvamento._t);
    mostrarAvisoSalvamento._t = setTimeout(() => aviso.classList.remove("visivel"), 1800);
  }

  // ---------------------------------------------------------------------
  // Cabeçalho
  // ---------------------------------------------------------------------

  function preencherCabecalho() {
    const c = estado.cabecalho;
    document.getElementById("campo-nome-casal").value = c.nomeCasal;
    document.getElementById("campo-data-evento").value = c.dataEvento;
    document.getElementById("campo-local").value = c.local;
    document.getElementById("campo-tempo-servico").value = c.tempoServicoHoras;
    document.getElementById("campo-convidados").value = c.convidados;
    document.getElementById("campo-assessoria").value = c.assessoria;
    document.getElementById("campo-data-fechamento").value = c.dataFechamento;
    document.getElementById("campo-validade-proposta").value = c.validadeProposta;
  }

  // Os listeners leem/gravam em `estado.cabecalho` (não numa cópia capturada), para
  // continuarem corretos depois de trocar de proposta (abrir/duplicar/nova).
  function ligarCabecalho() {
    document.getElementById("campo-nome-casal").addEventListener("input", (e) => {
      estado.cabecalho.nomeCasal = e.target.value;
      persistir();
      enviarApresentacaoParaBemVindos();
    });
    document.getElementById("campo-data-evento").addEventListener("input", (e) => {
      estado.cabecalho.dataEvento = e.target.value;
      persistir();
      recalcularTudo();
    });
    document.getElementById("campo-local").addEventListener("input", (e) => {
      estado.cabecalho.local = e.target.value;
      persistir();
    });
    document.getElementById("campo-tempo-servico").addEventListener("input", (e) => {
      estado.cabecalho.tempoServicoHoras = parseFloat(e.target.value) || CONFIG.horas.base;
      persistir();
      recalcularTudo();
    });
    document.getElementById("campo-convidados").addEventListener("input", (e) => {
      estado.cabecalho.convidados = parseInt(e.target.value, 10) || 0;
      persistir();
      recalcularTudo();
    });
    document.getElementById("campo-assessoria").addEventListener("input", (e) => {
      estado.cabecalho.assessoria = e.target.value;
      persistir();
    });
    document.getElementById("campo-data-fechamento").addEventListener("input", (e) => {
      estado.cabecalho.dataFechamento = e.target.value;
      persistir();
      recalcularTudo();
    });
    document.getElementById("campo-validade-proposta").addEventListener("input", (e) => {
      estado.cabecalho.validadeProposta = e.target.value;
      persistir();
    });
  }

  // ---------------------------------------------------------------------
  // Construção de cada bloco de pacote
  // ---------------------------------------------------------------------

  function htmlCardBebida(idPacote, tipo) {
    const oculto = tipo.id === "semAlcool" ? " oculto" : "";
    return `
      <div class="card-bebida ${tipo.classe}${oculto}" data-tipo-card="${tipo.id}">
        <div class="card-bebida-titulo">${tipo.nome}</div>
        <div class="card-bebida-linha">
          <label for="valor-${idPacote}-${tipo.id}" style="margin:0;">Valor por convidado</label>
          <input type="number" min="0" step="1" id="valor-${idPacote}-${tipo.id}" data-acao="valor-convidado" data-pacote="${idPacote}" data-tipo="${tipo.id}">
        </div>
        <div class="card-bebida-valor-ajustado" data-out="valorAjustado" data-pacote="${idPacote}" data-tipo="${tipo.id}"></div>
      </div>`;
  }

  // Drinks e caipirinhas são escolhidos uma vez e valem para os 3 pacotes.
  function htmlGruposDrinks(filtro) {
    const termo = (filtro || "").trim().toLowerCase();
    const selecionados = new Set(estado.drinksSelecionados);
    return CONFIG.catalogoDrinks
      .map((grupo) => {
        const itens = grupo.itens.filter((item) => !termo || item.nome.toLowerCase().includes(termo));
        if (itens.length === 0) return "";
        const linhas = itens
          .map((item) => {
            const marcado = selecionados.has(item.nome) ? "checked" : "";
            const autoral = item.autoral ? '<span class="autoral">autoral</span>' : "";
            const mocktail = grupo.semAlcoolApenas ? '<span class="mocktail-tag">mocktail</span>' : "";
            const obs = item.observacao ? `<span class="mocktail-tag">${item.observacao}</span>` : "";
            return `
              <label class="drink-item">
                <input type="checkbox" data-acao="drink" value="${item.nome}" ${marcado}>
                ${item.nome} ${autoral}${mocktail}${obs}
              </label>`;
          })
          .join("");
        return `<div class="drinks-grupo-nome">${grupo.destilado}</div>${linhas}`;
      })
      .join("");
  }

  function htmlCaipirinhas() {
    return estado.caipirinhas
      .map(
        (valor, indice) => `
      <div class="caipirinha-linha">
        <input type="text" placeholder="Nome e ingredientes (ex.: Jorge Amado — limão e maracujá)"
          value="${escaparHtml(valor)}" data-acao="caipirinha" data-indice="${indice}">
        <button type="button" class="botao-discreto" data-acao="remover-caipirinha" data-indice="${indice}" title="Remover">✕</button>
      </div>`
      )
      .join("");
  }

  function montarSecaoCompartilhada() {
    const container = document.getElementById("secao-drinks-caipirinhas");
    container.innerHTML = `
      <h2 class="pacote-titulo" style="font-size:1.7rem;">Drinks e caipirinhas</h2>
      <p class="pacote-descricao">Escolhidos uma vez pelo casal, valem para os três pacotes.</p>

      <div class="secao-titulo">Drinks escolhidos</div>
      <input type="text" class="drinks-busca" placeholder="Buscar na carta de coquetéis..." data-acao="buscar-drink">
      <div class="drinks-contador" id="contador-drinks-geral"></div>
      <div class="drinks-grupos" id="drinks-grupos-geral">${htmlGruposDrinks("")}</div>

      <div class="secao-titulo">Caipirinhas escolhidas (2 inclusas)</div>
      <div class="caipirinhas-lista" id="caipirinhas-lista-geral">${htmlCaipirinhas()}</div>
      <button type="button" class="botao-discreto" data-acao="adicionar-caipirinha" style="margin-top:0.6rem;">+ adicionar</button>
    `;

    if (container.dataset.eventosLigados) {
      atualizarTodosContadoresDrinks();
      return;
    }
    container.dataset.eventosLigados = "1";

    container.addEventListener("input", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "buscar-drink") {
        document.getElementById("drinks-grupos-geral").innerHTML = htmlGruposDrinks(alvo.value);
      } else if (alvo.dataset.acao === "caipirinha") {
        estado.caipirinhas[Number(alvo.dataset.indice)] = alvo.value;
        persistir();
      }
    });

    container.addEventListener("change", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "drink") {
        const lista = estado.drinksSelecionados;
        const indice = lista.indexOf(alvo.value);
        if (alvo.checked && indice === -1) lista.push(alvo.value);
        if (!alvo.checked && indice !== -1) lista.splice(indice, 1);
        persistir();
        atualizarTodosContadoresDrinks();
      }
    });

    container.addEventListener("click", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "adicionar-caipirinha") {
        estado.caipirinhas.push("");
        persistir();
        document.getElementById("caipirinhas-lista-geral").innerHTML = htmlCaipirinhas();
      } else if (alvo.dataset.acao === "remover-caipirinha") {
        estado.caipirinhas.splice(Number(alvo.dataset.indice), 1);
        persistir();
        document.getElementById("caipirinhas-lista-geral").innerHTML = htmlCaipirinhas();
      }
    });

    atualizarTodosContadoresDrinks();
  }

  function htmlCortesias(idPacote) {
    const chips = estado.pacotes[idPacote].cortesias
      .map(
        (cortesia, indice) => `
      <span class="cortesia-chip">
        ${escaparHtml(cortesia.nome)}${cortesia.valorReferencia ? ` · ${calc.formatarMoeda(cortesia.valorReferencia)}` : ""}
        <button type="button" data-acao="remover-cortesia" data-pacote="${idPacote}" data-indice="${indice}" title="Remover">✕</button>
      </span>`
      )
      .join("");
    return chips;
  }

  function htmlOpcoesPagamento(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const estadoPacote = estado.pacotes[idPacote];
    return configPacote.opcoesPagamento
      .map((opcao) => {
        const percentual = (estadoPacote.descontos[opcao.id] ?? opcao.percentualDesconto) * 100;
        const controleBoleto =
          opcao.metodo === "boleto"
            ? `
          <div class="opcao-pagamento-desconto">
            Nº de parcelas
            <input type="number" min="2" max="${CONFIG.pagamento.tetoParcelasBoleto}" class="parcelas-numero-input"
              data-acao="parcelas-boleto" data-pacote="${idPacote}" data-opcao="${opcao.id}">
          </div>`
            : "";
        const colunas = TIPOS_BEBIDA.map((tipo) => {
          const classeOculta = tipo.id === "semAlcool" ? " oculto" : "";
          return `
          <div class="opcao-pagamento-resultado-coluna coluna-tipo${classeOculta}" data-tipo-coluna="${tipo.id}">
            <h4>${tipo.nome}</h4>
            <div class="opcao-pagamento-total" data-out="total" data-pacote="${idPacote}" data-opcao="${opcao.id}" data-tipo="${tipo.id}"></div>
            <div class="opcao-pagamento-detalhe" data-out="detalhe" data-pacote="${idPacote}" data-opcao="${opcao.id}" data-tipo="${tipo.id}"></div>
          </div>`;
        }).join("");

        return `
        <div class="opcao-pagamento" data-opcao-card="${opcao.id}">
          <div class="opcao-pagamento-topo">
            <span class="opcao-pagamento-nome">${opcao.nome}</span>
            <span class="opcao-pagamento-desconto">
              Desconto
              <input type="number" min="0" max="100" step="0.5" value="${arred1(percentual)}"
                data-acao="percentual-desconto" data-pacote="${idPacote}" data-opcao="${opcao.id}">%
            </span>
          </div>
          ${controleBoleto}
          <div class="opcao-pagamento-aviso oculto" data-out="aviso" data-pacote="${idPacote}" data-opcao="${opcao.id}"></div>
          <div class="opcao-pagamento-resultados">${colunas}</div>
        </div>`;
      })
      .join("");
  }

  function arred1(n) {
    return Math.round(n * 10) / 10;
  }

  function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function montarBlocoPacote(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const container = document.getElementById(`pacote-${idPacote}`);
    container.innerHTML = `
      <div class="pacote-cabecalho">
        <h2 class="pacote-titulo">${configPacote.nome}</h2>
        <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
          <label class="toggle-sem-alcool" style="margin:0;">
            <input type="checkbox" data-acao="toggle-sem-alcool" data-pacote="${idPacote}">
            Mostrar card "Sem álcool"
          </label>
          <label class="toggle-sem-alcool" style="margin:0;">
            <input type="checkbox" data-acao="toggle-revelar-valores" data-pacote="${idPacote}">
            Revelar valores na TV
          </label>
        </div>
      </div>
      <p class="pacote-descricao">${configPacote.descricaoCurta}</p>

      <div class="secao-titulo">Bebidas</div>
      <div class="bebidas-grid" data-bebidas-grid="${idPacote}">
        ${TIPOS_BEBIDA.map((tipo) => htmlCardBebida(idPacote, tipo)).join("")}
      </div>

      <div class="drinks-contador" data-out="contador-drinks" data-pacote="${idPacote}" style="margin-top:0.8rem;"></div>

      <div class="secao-titulo">Cortesias</div>
      <div class="cortesias-lista" data-cortesias-lista="${idPacote}">${htmlCortesias(idPacote)}</div>
      <div style="display:flex; gap:0.6rem;">
        <input type="text" list="catalogo-adicionais" placeholder="Digite a cortesia e pressione Enter" data-acao="texto-cortesia" data-pacote="${idPacote}" style="flex:1;">
        <button type="button" data-acao="adicionar-cortesia" data-pacote="${idPacote}">+ adicionar</button>
      </div>
      <div class="cortesias-total-interno" data-out="total-cortesias" data-pacote="${idPacote}"></div>

      <div class="secao-titulo">Formas de pagamento</div>
      <div class="pagamento-grid" data-pagamento-grid="${idPacote}">${htmlOpcoesPagamento(idPacote)}</div>
    `;

    // valores por convidado
    TIPOS_BEBIDA.forEach((tipo) => {
      const input = document.getElementById(`valor-${idPacote}-${tipo.id}`);
      input.value = estado.pacotes[idPacote].valoresPorConvidado[tipo.id] ?? "";
    });

    document.getElementById(`pacote-${idPacote}`).querySelector('[data-acao="toggle-sem-alcool"]').checked =
      estado.pacotes[idPacote].ativoSemAlcool;
    document.getElementById(`pacote-${idPacote}`).querySelector('[data-acao="toggle-revelar-valores"]').checked =
      estado.pacotes[idPacote].valoresRevelados;

    if (!container.dataset.eventosLigados) {
      ligarEventosPacote(idPacote, container);
      container.dataset.eventosLigados = "1";
    }
    atualizarVisibilidadeSemAlcool(idPacote);
    recalcularPacote(idPacote);
  }

  function ligarEventosPacote(idPacote, container) {
    container.addEventListener("input", (evento) => {
      const alvo = evento.target;
      const acao = alvo.dataset.acao;
      if (!acao) return;
      const estadoPacote = estado.pacotes[idPacote];

      if (acao === "valor-convidado") {
        estadoPacote.valoresPorConvidado[alvo.dataset.tipo] = parseFloat(alvo.value) || 0;
        persistir();
        recalcularPacote(idPacote);
      } else if (acao === "percentual-desconto") {
        estadoPacote.descontos[alvo.dataset.opcao] = (parseFloat(alvo.value) || 0) / 100;
        persistir();
        recalcularPacote(idPacote);
      } else if (acao === "parcelas-boleto") {
        const n = parseInt(alvo.value, 10);
        estadoPacote.numeroParcelasBoletoManual = Number.isFinite(n)
          ? Math.min(n, CONFIG.pagamento.tetoParcelasBoleto)
          : null;
        persistir();
        recalcularPacote(idPacote);
      }
    });

    container.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && evento.target.dataset.acao === "texto-cortesia") {
        evento.preventDefault();
        adicionarCortesia(idPacote, evento.target);
      }
    });

    container.addEventListener("change", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "toggle-sem-alcool") {
        estado.pacotes[idPacote].ativoSemAlcool = alvo.checked;
        persistir();
        atualizarVisibilidadeSemAlcool(idPacote);
        recalcularPacote(idPacote);
      } else if (alvo.dataset.acao === "toggle-revelar-valores") {
        estado.pacotes[idPacote].valoresRevelados = alvo.checked;
        persistir();
        if (estadoApresentacao.modo === "espelho" && estadoApresentacao.pacoteEmFoco === idPacote) {
          enviarApresentacaoParaBemVindos();
        }
      }
    });

    container.addEventListener("click", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "adicionar-cortesia") {
        const input = container.querySelector(`[data-acao="texto-cortesia"][data-pacote="${idPacote}"]`);
        adicionarCortesia(idPacote, input);
      } else if (alvo.dataset.acao === "remover-cortesia") {
        estado.pacotes[idPacote].cortesias.splice(Number(alvo.dataset.indice), 1);
        persistir();
        renderizarCortesias(idPacote);
      }
    });
  }

  function adicionarCortesia(idPacote, input) {
    const nome = input.value.trim();
    if (!nome) return;
    const doCatalogo = CONFIG.catalogoAdicionais.find((a) => a.nome.toLowerCase() === nome.toLowerCase());
    estado.pacotes[idPacote].cortesias.push({
      nome: doCatalogo ? doCatalogo.nome : nome,
      valorReferencia: doCatalogo ? doCatalogo.valorReferencia : null,
    });
    input.value = "";
    persistir();
    renderizarCortesias(idPacote);
  }

  function renderizarCortesias(idPacote) {
    document.querySelector(`[data-cortesias-lista="${idPacote}"]`).innerHTML = htmlCortesias(idPacote);
    const total = estado.pacotes[idPacote].cortesias.reduce((soma, c) => soma + (c.valorReferencia || 0), 0);
    const elementoTotal = document.querySelector(`[data-out="total-cortesias"][data-pacote="${idPacote}"]`);
    elementoTotal.textContent = total > 0 ? `Total em cortesias (uso interno): ${calc.formatarMoeda(total)}` : "";
  }

  function atualizarContadorDrinks(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const quantidade = estado.drinksSelecionados.length;
    const elemento = document.querySelector(`[data-out="contador-drinks"][data-pacote="${idPacote}"]`);
    if (!elemento) return;
    elemento.textContent = `Drinks escolhidos: ${quantidade} / ${configPacote.limiteDrinks} neste pacote`;
    elemento.classList.toggle("excedido", quantidade > configPacote.limiteDrinks);
  }

  function atualizarTodosContadoresDrinks() {
    Object.keys(CONFIG.pacotes).forEach(atualizarContadorDrinks);
    const elementoGeral = document.getElementById("contador-drinks-geral");
    if (elementoGeral) elementoGeral.textContent = `Selecionados: ${estado.drinksSelecionados.length}`;
  }

  function atualizarVisibilidadeSemAlcool(idPacote) {
    const ativo = estado.pacotes[idPacote].ativoSemAlcool;
    document
      .querySelectorAll(`#pacote-${idPacote} [data-tipo-card="semAlcool"]`)
      .forEach((el) => el.classList.toggle("oculto", !ativo));
    document
      .querySelectorAll(`#pacote-${idPacote} [data-tipo-coluna="semAlcool"]`)
      .forEach((el) => el.classList.toggle("oculto", !ativo));
  }

  // ---------------------------------------------------------------------
  // Cálculo e atualização dos campos de saída
  // ---------------------------------------------------------------------

  function recalcularPacote(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const estadoPacote = estado.pacotes[idPacote];
    const c = estado.cabecalho;

    TIPOS_BEBIDA.forEach((tipo) => {
      const saidaAjustado = document.querySelector(`[data-out="valorAjustado"][data-pacote="${idPacote}"][data-tipo="${tipo.id}"]`);

      configPacote.opcoesPagamento.forEach((opcao) => {
        const elementoTotal = document.querySelector(
          `[data-out="total"][data-pacote="${idPacote}"][data-opcao="${opcao.id}"][data-tipo="${tipo.id}"]`
        );
        const elementoDetalhe = document.querySelector(
          `[data-out="detalhe"][data-pacote="${idPacote}"][data-opcao="${opcao.id}"][data-tipo="${tipo.id}"]`
        );
        if (!elementoTotal) return;

        const resultado = proposta.calcularOpcaoParaTipo(estado, idPacote, tipo.id, opcao);

        if (saidaAjustado) {
          saidaAjustado.textContent =
            c.tempoServicoHoras > CONFIG.horas.base
              ? `Ajustado (${c.tempoServicoHoras}h): ${calc.formatarMoeda(resultado.valorAjustado, { comCentavos: true })}`
              : "";
        }

        elementoTotal.textContent = calc.formatarMoeda(resultado.totalComDesconto);
        elementoDetalhe.textContent = resultado.detalhe;

        if (opcao.metodo === "boleto") {
          const inputParcelas = document.querySelector(
            `[data-acao="parcelas-boleto"][data-pacote="${idPacote}"][data-opcao="${opcao.id}"]`
          );
          if (inputParcelas && document.activeElement !== inputParcelas) {
            inputParcelas.value = resultado.numeroParcelas || "";
          }
          const cartao = elementoTotal.closest(".opcao-pagamento");
          const avisoElemento = document.querySelector(`[data-out="aviso"][data-pacote="${idPacote}"][data-opcao="${opcao.id}"]`);
          const temAviso = Boolean(resultado.aviso);
          if (avisoElemento) {
            avisoElemento.textContent = resultado.aviso || "";
            avisoElemento.classList.toggle("oculto", !temAviso);
          }
          if (cartao) cartao.querySelector(".opcao-pagamento-resultados").classList.toggle("oculto", temAviso);
        }
      });
    });

    atualizarContadorDrinks(idPacote);
  }

  function recalcularTudo() {
    Object.keys(CONFIG.pacotes).forEach(recalcularPacote);
  }

  // ---------------------------------------------------------------------
  // Tela de Bem-Vindos (abrir / espelhar)
  // ---------------------------------------------------------------------

  function configurarBotoesApresentacao() {
    document.getElementById("botao-abrir-bemvindos").addEventListener("click", () => {
      window.open("bemvindos.html", "madz_bemvindos", "width=1280,height=720");
      setTimeout(enviarApresentacaoParaBemVindos, 300);
    });

    const botaoEspelhar = document.getElementById("botao-espelhar");
    botaoEspelhar.addEventListener("click", () => {
      estadoApresentacao.modo = estadoApresentacao.modo === "espelho" ? "bemvindos" : "espelho";
      botaoEspelhar.classList.toggle("botao-principal", estadoApresentacao.modo === "espelho");
      botaoEspelhar.textContent = estadoApresentacao.modo === "espelho" ? "Espelhando apresentação" : "Espelhar apresentação";
      enviarApresentacaoParaBemVindos();
    });
  }

  // Detecta qual pacote está mais visível na tela do vendedor, para a TV (quando
  // espelhada) acompanhar automaticamente o que está sendo apresentado ao casal.
  function configurarFocoDePacote() {
    const secaoResumo = document.getElementById("secao-drinks-caipirinhas");
    const secoes = [
      secaoResumo,
      ...Object.keys(CONFIG.pacotes).map((id) => document.getElementById(`pacote-${id}`)),
    ].filter(Boolean);
    if (!secoes.length || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      (entradas) => {
        let maisVisivel = null;
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting && (!maisVisivel || entrada.intersectionRatio > maisVisivel.intersectionRatio)) {
            maisVisivel = entrada;
          }
        });
        if (!maisVisivel) return;
        const idFoco = maisVisivel.target === secaoResumo ? "resumo" : maisVisivel.target.id.replace("pacote-", "");
        if (idFoco !== estadoApresentacao.pacoteEmFoco) {
          estadoApresentacao.pacoteEmFoco = idFoco;
          if (estadoApresentacao.modo === "espelho") enviarApresentacaoParaBemVindos();
        }
      },
      { threshold: [0.3, 0.5, 0.7] }
    );
    secoes.forEach((secao) => observador.observe(secao));
  }

  // ---------------------------------------------------------------------
  // Exportação em PDF (impressão)
  // ---------------------------------------------------------------------

  function infoDrink(nome) {
    for (const grupo of CONFIG.catalogoDrinks) {
      const item = grupo.itens.find((i) => i.nome === nome);
      if (item) return item;
    }
    return null;
  }

  function htmlPaginaCapa() {
    const c = estado.cabecalho;
    return `
      <div class="pagina-impressao pagina-capa">
        <img class="logo-impressao" src="assets/logo_madz_branco_transparente.png" alt="MADZ Eventos">
        <h1 class="nome-casal-impressao">${escaparHtml(c.nomeCasal || "")}</h1>
        <div class="detalhes-evento">
          <div>Local<strong>${escaparHtml(c.local || "—")}</strong></div>
          <div>Data do evento<strong>${c.dataEvento ? formatarDataBr(c.dataEvento) : "—"}</strong></div>
          <div>Tempo de serviço<strong>${c.tempoServicoHoras}h</strong></div>
          <div>Convidados<strong>${c.convidados}</strong></div>
          <div>Assessoria<strong>${escaparHtml(c.assessoria || "—")}</strong></div>
        </div>
        <div class="validade-impressao">${c.validadeProposta ? `Proposta válida até ${formatarDataBr(c.validadeProposta)}` : ""}</div>
      </div>`;
  }

  function htmlPaginaPacote(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const estadoPacote = estado.pacotes[idPacote];
    const tipos = tiposAtivos(estadoPacote);

    const drinksHtml = estado.drinksSelecionados.length
      ? `<ul>${estado.drinksSelecionados
          .map((nome) => {
            const info = infoDrink(nome);
            return `<li>${escaparHtml(nome)}${info && info.autoral ? " (autoral)" : ""}</li>`;
          })
          .join("")}</ul>`
      : `<p class="inclui-impressao">A combinar na degustação.</p>`;

    const caipirinhasValidas = estado.caipirinhas.filter((c) => c.trim());
    const caipirinhasHtml = caipirinhasValidas.length
      ? `<ul>${caipirinhasValidas.map((c) => `<li>${escaparHtml(c)}</li>`).join("")}</ul>`
      : `<p class="inclui-impressao">A combinar na degustação.</p>`;

    const cortesiasHtml = estadoPacote.cortesias.length
      ? estadoPacote.cortesias
          .map(
            (cort) =>
              `<div class="cortesia-item-impressao">${escaparHtml(cort.nome)}${cort.valorReferencia ? ` · ${calc.formatarMoeda(cort.valorReferencia)}` : ""}</div>`
          )
          .join("")
      : `<p class="inclui-impressao">—</p>`;

    const colunasPagamentoHtml = tipos
      .map((tipo) => {
        const valorAjustado = proposta.calcularOpcaoParaTipo(estado, idPacote, tipo.id, configPacote.opcoesPagamento[0]).valorAjustado;
        const linhas = configPacote.opcoesPagamento
          .map((opcao) => {
            const resultado = proposta.calcularOpcaoParaTipo(estado, idPacote, tipo.id, opcao);
            const detalhe = resultado.aviso
              ? `<span class="detalhe-impressao">${resultado.aviso}</span>`
              : `<span class="detalhe-impressao">${resultado.detalhe}</span>`;
            const total = resultado.aviso ? "" : `<span class="total-impressao">${calc.formatarMoeda(resultado.totalComDesconto)}</span>`;
            return `
              <div class="linha-opcao-impressao">
                <div class="linha-opcao-impressao-topo">
                  <span class="nome-opcao">${opcao.nome}</span>
                  ${total}
                </div>
                ${detalhe}
              </div>`;
          })
          .join("");
        return `
          <div class="coluna-tipo-impressao">
            <div class="coluna-tipo-impressao-cabecalho">
              <div class="tipo-nome">${tipo.nome}</div>
              <div class="valor-convidado">${calc.formatarMoeda(valorAjustado, { comCentavos: true })} / convidado</div>
            </div>
            ${linhas}
          </div>`;
      })
      .join('<div class="divisor-coluna-impressao"></div>');

    return `
      <div class="pagina-impressao pagina-pacote">
        <div class="cabecalho-impressao">
          <div>
            <h2 class="titulo-impressao">${configPacote.nome}</h2>
            <div class="inclui-impressao">${configPacote.descricaoCurta}</div>
          </div>
          <img class="logo-impressao" style="width:60px;" src="assets/logo_madz_branco_transparente.png" alt="MADZ Eventos">
        </div>
        <div class="corpo-impressao">
          <div class="coluna-detalhes-impressao">
            <div class="bloco-impressao"><h3>Drinks escolhidos</h3>${drinksHtml}</div>
            <div class="bloco-impressao"><h3>Caipirinhas escolhidas</h3>${caipirinhasHtml}</div>
            <div class="bloco-impressao"><h3>Cortesias</h3>${cortesiasHtml}</div>
          </div>
          <div class="coluna-pagamento-impressao">
            <div class="colunas-pagamento-impressao">${colunasPagamentoHtml}</div>
          </div>
        </div>
      </div>`;
  }

  function montarImpressao() {
    const paginas = [htmlPaginaCapa(), ...Object.keys(CONFIG.pacotes).map(htmlPaginaPacote)];
    document.getElementById("area-impressao").innerHTML = paginas.join("");
  }

  // ---------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------

  function montarDatalistCortesias() {
    const datalist = document.getElementById("catalogo-adicionais");
    datalist.innerHTML = CONFIG.catalogoAdicionais.map((a) => `<option value="${escaparHtml(a.nome)}">`).join("");
  }

  // Garante que as fontes (Great Vibes no nome do casal, Cormorant Garamond nos
  // títulos) já estejam carregadas antes de imprimir — senão o primeiro PDF do dia
  // pode sair com a fonte de substituição do navegador por uma fração de segundo de atraso.
  async function garantirFontesCarregadas() {
    if (!document.fonts) return;
    try {
      await Promise.all([
        document.fonts.load('60px "Great Vibes"'),
        document.fonts.load('700 40px "Cormorant Garamond"'),
        document.fonts.load('400 16px "Montserrat"'),
      ]);
      await document.fonts.ready;
    } catch (e) {
      // não é crítico — segue para a impressão mesmo assim
    }
  }

  function configurarExportacaoPdf() {
    document.getElementById("botao-exportar-pdf").addEventListener("click", async () => {
      montarImpressao();
      await garantirFontesCarregadas();
      window.print();
    });
  }

  // ---------------------------------------------------------------------
  // Propostas salvas (reabrir / duplicar / excluir / nova)
  // ---------------------------------------------------------------------

  function trocarProposta(novoEstado) {
    estado = garantirCamposCompartilhados(novoEstado);
    preencherCabecalho();
    montarSecaoCompartilhada();
    Object.keys(CONFIG.pacotes).forEach(montarBlocoPacote);
    enviarApresentacaoParaBemVindos();
  }

  function formatarDataHoraBr(isoCompleto) {
    const data = new Date(isoCompleto);
    return data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR").slice(0, 5);
  }

  function renderizarListaPropostas() {
    const lista = state.listarPropostas();
    const container = document.getElementById("lista-propostas-salvas");
    if (lista.length === 0) {
      container.innerHTML = `<p style="color:var(--cor-texto-suave);">Nenhuma proposta salva ainda. Propostas com nome do casal preenchido aparecem aqui automaticamente.</p>`;
      return;
    }
    container.innerHTML = lista
      .map(
        (item) => `
      <div class="proposta-salva-item">
        <div class="proposta-salva-info">
          <strong>${escaparHtml(item.nomeCasal)}</strong>
          <span>${item.dataEvento ? "Evento em " + formatarDataBr(item.dataEvento) + " · " : ""}Atualizada em ${formatarDataHoraBr(item.atualizadoEm)}</span>
        </div>
        <div class="proposta-salva-acoes">
          <button type="button" data-acao-proposta="abrir" data-id="${item.id}">Abrir</button>
          <button type="button" data-acao-proposta="duplicar" data-id="${item.id}">Duplicar</button>
          <button type="button" class="botao-discreto" data-acao-proposta="excluir" data-id="${item.id}">Excluir</button>
        </div>
      </div>`
      )
      .join("");
  }

  function configurarPropostasSalvas() {
    const modal = document.getElementById("modal-propostas");

    function abrirModal() {
      renderizarListaPropostas();
      modal.classList.remove("oculto");
    }
    function fecharModal() {
      modal.classList.add("oculto");
    }

    document.getElementById("botao-propostas-salvas").addEventListener("click", abrirModal);
    document.getElementById("botao-fechar-propostas").addEventListener("click", fecharModal);
    modal.addEventListener("click", (evento) => {
      if (evento.target === modal) fecharModal();
    });

    document.getElementById("botao-nova-proposta").addEventListener("click", () => {
      if (!confirm("Começar uma proposta nova? A proposta atual continua salva na lista, se tiver nome do casal.")) return;
      trocarProposta(state.criarPadrao());
      fecharModal();
    });

    document.getElementById("lista-propostas-salvas").addEventListener("click", (evento) => {
      const alvo = evento.target;
      const acao = alvo.dataset.acaoProposta;
      if (!acao) return;
      const id = alvo.dataset.id;

      if (acao === "abrir") {
        const proposta = state.abrirProposta(id);
        if (proposta) {
          trocarProposta(proposta);
          fecharModal();
        }
      } else if (acao === "duplicar") {
        state.duplicarProposta(id);
        renderizarListaPropostas();
      } else if (acao === "excluir") {
        if (confirm("Excluir esta proposta salva? Essa ação não pode ser desfeita.")) {
          state.excluirProposta(id);
          renderizarListaPropostas();
        }
      }
    });
  }

  function iniciar() {
    preencherCabecalho();
    ligarCabecalho();
    montarDatalistCortesias();
    montarSecaoCompartilhada();
    Object.keys(CONFIG.pacotes).forEach(montarBlocoPacote);
    configurarBotoesApresentacao();
    configurarFocoDePacote();
    configurarExportacaoPdf();
    configurarPropostasSalvas();
    if (estado.cabecalho.nomeCasal) state.salvarComoProposta(estado);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
