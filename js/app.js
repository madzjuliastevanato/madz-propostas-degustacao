(function () {
  const CONFIG = window.MADZ_CONFIG;
  const calc = window.MADZ_CALC;
  const state = window.MADZ_STATE;

  function garantirCamposCompartilhados(alvo) {
    if (!Array.isArray(alvo.drinksSelecionados)) alvo.drinksSelecionados = [];
    if (!Array.isArray(alvo.caipirinhas) || alvo.caipirinhas.length === 0) alvo.caipirinhas = ["", ""];
    if (!Array.isArray(alvo.adicionaisSelecionados)) alvo.adicionaisSelecionados = [];
    if (!alvo.fotoPrincipalAdicionais || typeof alvo.fotoPrincipalAdicionais !== "object") {
      alvo.fotoPrincipalAdicionais = {};
    }
    if (!alvo.resumoCompra || typeof alvo.resumoCompra !== "object") {
      alvo.resumoCompra = { pacoteEscolhido: null, tipoBebidaEscolhido: null, opcaoPagamentoEscolhida: null };
    }
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

  const estadoApresentacao = { modo: "bemvindos", pacoteEmFoco: "resumo", abaAtiva: "pacotes" };

  // Reenvia para a TV quando a aba atual é uma das que ela espelha ao vivo
  // (Adicionais e Resumo acompanham cada marcação/edição; Pacotes é via scroll).
  function atualizarTvSeNecessario() {
    if (estadoApresentacao.modo !== "espelho") return;
    if (estadoApresentacao.abaAtiva === "adicionais" || estadoApresentacao.abaAtiva === "resumo") {
      enviarApresentacaoParaBemVindos();
    }
  }

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
    const marcas = CONFIG.rotulosBebidas[tipo.id];
    return `
      <div class="card-bebida ${tipo.classe}${oculto}" data-tipo-card="${tipo.id}">
        <div class="card-bebida-titulo">${tipo.nome}</div>
        ${marcas ? `<div class="card-bebida-marcas">${marcas}</div>` : ""}
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

  // Lista de referência (clicável) com todas as cortesias padronizadas do
  // catálogo e o valor de cada uma, pra o vendedor escolher sem precisar digitar.
  function htmlSugestoesCortesias(idPacote) {
    return proposta
      .itensAdicionaisPlano()
      .map(
        (item) =>
          `<button type="button" class="cortesia-sugestao-chip" data-acao="sugestao-cortesia" data-pacote="${idPacote}" data-nome="${escaparHtml(item.nome)}">
            ${escaparHtml(item.nome)}${item.valorReferencia != null ? ` · ${calc.formatarMoeda(item.valorReferencia)}` : ""}
          </button>`
      )
      .join("");
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
            <input type="checkbox" data-acao="toggle-revelar-valores-pessoa" data-pacote="${idPacote}">
            Revelar valores por pessoa
          </label>
          <label class="toggle-sem-alcool" style="margin:0;">
            <input type="checkbox" data-acao="toggle-revelar-cortesias" data-pacote="${idPacote}">
            Revelar cortesias
          </label>
          <label class="toggle-sem-alcool" style="margin:0;">
            <input type="checkbox" data-acao="toggle-revelar-valores" data-pacote="${idPacote}">
            Revelar formas de pagamento
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
      <div class="cortesias-sugestoes-titulo">Opções padronizadas (clique para adicionar)</div>
      <div class="cortesias-sugestoes">${htmlSugestoesCortesias(idPacote)}</div>

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
    document.getElementById(`pacote-${idPacote}`).querySelector('[data-acao="toggle-revelar-valores-pessoa"]').checked =
      estado.pacotes[idPacote].valoresPorPessoaRevelados;
    document.getElementById(`pacote-${idPacote}`).querySelector('[data-acao="toggle-revelar-cortesias"]').checked =
      estado.pacotes[idPacote].cortesiasReveladas;
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
      } else if (alvo.dataset.acao === "toggle-revelar-valores-pessoa") {
        estado.pacotes[idPacote].valoresPorPessoaRevelados = alvo.checked;
        persistir();
        if (estadoApresentacao.modo === "espelho" && estadoApresentacao.pacoteEmFoco === idPacote) {
          enviarApresentacaoParaBemVindos();
        }
      } else if (alvo.dataset.acao === "toggle-revelar-cortesias") {
        estado.pacotes[idPacote].cortesiasReveladas = alvo.checked;
        persistir();
        if (estadoApresentacao.modo === "espelho" && estadoApresentacao.pacoteEmFoco === idPacote) {
          enviarApresentacaoParaBemVindos();
        }
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
      } else if (alvo.dataset.acao === "sugestao-cortesia") {
        adicionarCortesiaPorNome(idPacote, alvo.dataset.nome);
      } else if (alvo.dataset.acao === "remover-cortesia") {
        estado.pacotes[idPacote].cortesias.splice(Number(alvo.dataset.indice), 1);
        persistir();
        renderizarCortesias(idPacote);
      }
    });
  }

  function adicionarCortesia(idPacote, input) {
    adicionarCortesiaPorNome(idPacote, input.value);
    input.value = "";
  }

  function adicionarCortesiaPorNome(idPacote, nomeDigitado) {
    const nome = nomeDigitado.trim();
    if (!nome) return;
    const doCatalogo = proposta.itensAdicionaisPlano().find((a) => a.nome.toLowerCase() === nome.toLowerCase());
    estado.pacotes[idPacote].cortesias.push({
      nome: doCatalogo ? doCatalogo.nome : nome,
      valorReferencia: doCatalogo ? doCatalogo.valorReferencia : null,
    });
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
  // Mede sobreposição em pixels com a janela visível (não a razão em relação à
  // altura da própria seção), para funcionar bem em qualquer altura de tela ou
  // de seção — ao contrário de IntersectionObserver com thresholds fixos.
  // Só atua enquanto a aba "Pacotes" está ativa; as outras abas controlam o foco
  // da TV por conta própria (ver configurarAbas).
  let atualizarFocoPacote = function () {};

  // Escolhe, entre as seções visíveis, aquela por onde passa uma "linha de foco"
  // a 40% do topo da janela — não a que ocupa mais pixels da tela. Ocupar mais
  // pixels favorece sempre as seções mais altas, então uma seção curta (ex.:
  // Torre de Taças, com só 1 item) nunca ganhava e ficava pulada na TV.
  // Usa só a parte visível (recortada pela janela) de cada seção: usar o centro
  // da seção inteira (sem recorte) faz uma seção alta quase toda rolada para
  // fora da tela "ganhar" por coincidência matemática, mesmo com só uma tira
  // visível, roubando o foco de quem está de fato na linha.
  function encontrarSecaoEmFoco(secoes) {
    const alturaJanela = window.innerHeight;
    const linhaFoco = alturaJanela * 0.4;
    let secaoNaLinha = null;
    let melhorSecao = null;
    let menorDistancia = Infinity;
    secoes.forEach((secao) => {
      const r = secao.getBoundingClientRect();
      const topoVisivel = Math.max(r.top, 0);
      const baseVisivel = Math.min(r.bottom, alturaJanela);
      if (baseVisivel <= topoVisivel) return;
      if (linhaFoco >= topoVisivel && linhaFoco <= baseVisivel) {
        secaoNaLinha = secao;
      }
      const distancia =
        linhaFoco < topoVisivel ? topoVisivel - linhaFoco : linhaFoco > baseVisivel ? linhaFoco - baseVisivel : 0;
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        melhorSecao = secao;
      }
    });
    return secaoNaLinha || melhorSecao;
  }

  function configurarFocoDePacote() {
    const secaoResumo = document.getElementById("secao-drinks-caipirinhas");
    const secoes = [
      secaoResumo,
      ...Object.keys(CONFIG.pacotes).map((id) => document.getElementById(`pacote-${id}`)),
    ].filter(Boolean);
    if (!secoes.length) return;

    function atualizarFoco() {
      if (estadoApresentacao.abaAtiva !== "pacotes") return;
      const melhorSecao = encontrarSecaoEmFoco(secoes);
      if (!melhorSecao) return;
      const idFoco = melhorSecao === secaoResumo ? "resumo" : melhorSecao.id.replace("pacote-", "");
      if (idFoco !== estadoApresentacao.pacoteEmFoco) {
        estadoApresentacao.pacoteEmFoco = idFoco;
        if (estadoApresentacao.modo === "espelho") enviarApresentacaoParaBemVindos();
      }
    }

    atualizarFocoPacote = atualizarFoco;

    let agendado = false;
    window.addEventListener("scroll", () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        atualizarFoco();
      });
    });
    atualizarFoco();
  }

  // Mesma lógica, mas para as categorias dentro da aba "Adicionais" — a TV
  // acompanha qual categoria o vendedor está mostrando (fotos + preços).
  let atualizarFocoAdicional = function () {};

  function configurarFocoDeAdicional() {
    function atualizarFoco() {
      if (estadoApresentacao.abaAtiva !== "adicionais") return;
      const secoes = Array.from(document.querySelectorAll("#aba-adicionais .categoria-adicional"));
      if (!secoes.length) return;
      const melhorSecao = encontrarSecaoEmFoco(secoes);
      if (!melhorSecao) return;
      const idFoco = "adicional:" + melhorSecao.dataset.categoria;
      if (idFoco !== estadoApresentacao.pacoteEmFoco) {
        estadoApresentacao.pacoteEmFoco = idFoco;
        if (estadoApresentacao.modo === "espelho") enviarApresentacaoParaBemVindos();
      }
    }

    atualizarFocoAdicional = atualizarFoco;

    let agendado = false;
    window.addEventListener("scroll", () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        atualizarFoco();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Navegação em abas (Pacotes / Adicionais / Resumo)
  // ---------------------------------------------------------------------

  function configurarAbas() {
    const botoes = Array.from(document.querySelectorAll(".aba-botao"));
    botoes.forEach((botao) => {
      botao.addEventListener("click", () => {
        const aba = botao.dataset.aba;
        if (aba === estadoApresentacao.abaAtiva) return;
        botoes.forEach((b) => b.classList.toggle("ativa", b === botao));
        document.querySelectorAll(".aba-conteudo").forEach((el) => el.classList.add("oculto"));
        document.getElementById(`aba-${aba}`).classList.remove("oculto");
        estadoApresentacao.abaAtiva = aba;

        if (aba === "pacotes") {
          atualizarFocoPacote();
        } else if (aba === "adicionais") {
          atualizarFocoAdicional();
        } else if (aba === "resumo") {
          estadoApresentacao.pacoteEmFoco = "resumo-compra";
          if (estadoApresentacao.modo === "espelho") enviarApresentacaoParaBemVindos();
        }
      });
    });
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
        const marcas = CONFIG.rotulosBebidas[tipo.id];
        return `
          <div class="coluna-tipo-impressao">
            <div class="coluna-tipo-impressao-cabecalho">
              <div class="tipo-nome">${tipo.nome}</div>
              <div class="valor-convidado">${calc.formatarMoeda(valorAjustado, { comCentavos: true })} / convidado</div>
              ${marcas ? `<div class="marcas-impressao">${marcas}</div>` : ""}
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

  function htmlPaginaResumoCompra() {
    const dados = proposta.dadosResumoCompra(estado);
    if (!dados || dados.avisoPacote) return "";

    const adicionaisHtml = dados.adicionais.length
      ? dados.adicionais
          .map(
            (a) =>
              `<div class="resumo-impressao-linha-adicional"><span>${escaparHtml(a.categoria)} — ${escaparHtml(a.nome)}</span><span>${calc.formatarMoeda(a.valorExibido)}</span></div>`
          )
          .join("")
      : `<p class="inclui-impressao">Nenhum adicional selecionado.</p>`;

    return `
      <div class="pagina-impressao pagina-resumo">
        <div class="cabecalho-impressao">
          <h2 class="titulo-impressao">Resumo da compra</h2>
          <img class="logo-impressao" style="width:60px;" src="assets/logo_madz_branco_transparente.png" alt="MADZ Eventos">
        </div>
        <div class="resumo-impressao-linha-pacote">
          <span>${dados.pacoteNome} — ${dados.tipoNome} — ${dados.opcaoNome}${dados.detalhePacote ? ` (${dados.detalhePacote})` : ""}</span>
          <strong>${calc.formatarMoeda(dados.totalPacote)}</strong>
        </div>
        <div class="resumo-impressao-subtitulo">Adicionais selecionados</div>
        ${adicionaisHtml}
        <div class="resumo-impressao-total">
          <span>Total geral</span>
          <strong>${calc.formatarMoeda(dados.totalGeral)}</strong>
        </div>
      </div>`;
  }

  function montarImpressao() {
    const paginas = [
      htmlPaginaCapa(),
      ...Object.keys(CONFIG.pacotes).map(htmlPaginaPacote),
      htmlPaginaResumoCompra(),
    ];
    document.getElementById("area-impressao").innerHTML = paginas.join("");
  }

  // ---------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------

  function montarDatalistCortesias() {
    const datalist = document.getElementById("catalogo-adicionais");
    datalist.innerHTML = proposta.itensAdicionaisPlano().map((a) => `<option value="${escaparHtml(a.nome)}">`).join("");
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
  // Aba "Adicionais" (vitrine)
  // ---------------------------------------------------------------------

  function chaveAdicional(categoria, nome) {
    return `${categoria}::${nome}`;
  }

  function adicionalSelecionado(categoria, nome) {
    return estado.adicionaisSelecionados.find((a) => a.categoria === categoria && a.nome === nome);
  }

  function htmlItemAdicional(categoria, item) {
    const chave = chaveAdicional(categoria, item.nome);
    const selecionado = adicionalSelecionado(categoria, item.nome);
    const observacao = item.observacao ? `<span class="item-adicional-observacao">${item.observacao}</span>` : "";

    if (item.valorReferencia == null) {
      return `
        <div class="item-adicional" data-chave="${chave}">
          <label>
            <input type="checkbox" data-acao="toggle-adicional-manual" data-categoria="${categoria}" data-nome="${escaparHtml(item.nome)}" ${selecionado ? "checked" : ""}>
            ${escaparHtml(item.nome)} ${observacao}
          </label>
          <span class="item-adicional-valor">
            R$ <input type="number" min="0" step="1" placeholder="valor combinado" data-acao="valor-adicional-manual"
              data-categoria="${categoria}" data-nome="${escaparHtml(item.nome)}" value="${selecionado && selecionado.valorTotal ? selecionado.valorTotal : ""}"
              ${selecionado ? "" : "disabled"}>
          </span>
        </div>`;
    }

    const temDesconto = selecionado && selecionado.valorFinal != null && selecionado.valorFinal !== item.valorReferencia;
    const desconto = temDesconto ? item.valorReferencia - selecionado.valorFinal : 0;
    const campoQuantidade =
      item.quantidadePadrao != null
        ? `
          <span class="item-adicional-quantidade-campo">
            <input type="number" min="0" step="1" data-acao="quantidade-adicional"
              data-categoria="${categoria}" data-nome="${escaparHtml(item.nome)}"
              value="${selecionado && selecionado.quantidade != null ? selecionado.quantidade : item.quantidadePadrao}"
              ${selecionado ? "" : "disabled"}>
            ${escaparHtml(item.unidadeQuantidade || "")}
          </span>`
        : "";

    return `
      <div class="item-adicional" data-chave="${chave}">
        <label>
          <input type="checkbox" data-acao="toggle-adicional" data-categoria="${categoria}" data-nome="${escaparHtml(item.nome)}" data-valor="${item.valorReferencia}" ${selecionado ? "checked" : ""}>
          ${escaparHtml(item.nome)} ${observacao}
        </label>
        <div class="item-adicional-precos">
          <span class="item-adicional-valor${temDesconto ? " com-desconto" : ""}">${calc.formatarMoeda(item.valorReferencia)}</span>
          ${campoQuantidade}
          <span class="item-adicional-valor-final-campo">
            R$ <input type="number" min="0" step="1" placeholder="valor final" data-acao="valor-final-adicional"
              data-categoria="${categoria}" data-nome="${escaparHtml(item.nome)}"
              value="${selecionado && selecionado.valorFinal != null ? selecionado.valorFinal : ""}"
              ${selecionado ? "" : "disabled"}>
            ${temDesconto ? `<span class="item-adicional-desconto-info">− ${calc.formatarMoeda(desconto)}</span>` : ""}
          </span>
        </div>
      </div>`;
  }

  function htmlCategoriaAdicional(categoria) {
    const indicePrincipal = proposta.indiceFotoPrincipal(estado, categoria.categoria, categoria.fotos.length);
    const fotosHtml = categoria.fotos.length
      ? categoria.fotos
          .map(
            (src, indice) => `
              <button type="button" class="categoria-adicional-foto-botao${indice === indicePrincipal ? " selecionada" : ""}"
                data-acao="selecionar-foto-principal" data-categoria="${categoria.categoria}" data-indice="${indice}"
                title="Mostrar esta foto em destaque na tela espelhada">
                <img class="categoria-adicional-foto" src="${src}" alt="${categoria.categoria}">
              </button>`
          )
          .join("")
      : `<div class="categoria-adicional-foto-placeholder">Foto a confirmar</div><div class="categoria-adicional-foto-placeholder">Foto a confirmar</div>`;

    return `
      <div class="categoria-adicional" data-categoria="${categoria.categoria}">
        <div class="categoria-adicional-topo">
          <div class="categoria-adicional-info">
            <h2 class="categoria-adicional-nome">${categoria.categoria}</h2>
            <p class="categoria-adicional-explicacao">${categoria.explicacao}</p>
          </div>
          <div class="categoria-adicional-fotos">${fotosHtml}</div>
        </div>
        ${categoria.itens.map((item) => htmlItemAdicional(categoria.categoria, item)).join("")}
      </div>`;
  }

  function atualizarTotalAdicionais() {
    const elemento = document.getElementById("adicionais-total-barra");
    if (!elemento) return;
    const total = estado.adicionaisSelecionados.reduce((soma, a) => soma + (proposta.valorEfetivoAdicional(a) || 0), 0);
    const quantidade = estado.adicionaisSelecionados.length;
    const rotulo = quantidade === 1 ? "adicional selecionado" : "adicionais selecionados";
    elemento.innerHTML = `<span>${quantidade} ${rotulo}</span><strong>Total: ${calc.formatarMoeda(total)}</strong>`;
  }

  function montarAbaAdicionais() {
    const container = document.getElementById("aba-adicionais");
    container.innerHTML = `
      <div class="adicionais-cabecalho">
        <h1 class="pacote-titulo" style="font-size:1.8rem;">Adicionais</h1>
        <p>Marque com o casal os extras escolhidos — o valor entra direto no resumo final.</p>
      </div>
      ${CONFIG.catalogoAdicionais.map(htmlCategoriaAdicional).join("")}
      <div class="adicionais-total-barra" id="adicionais-total-barra"></div>
    `;
    atualizarTotalAdicionais();

    if (container.dataset.eventosLigados) return;
    container.dataset.eventosLigados = "1";

    container.addEventListener("click", (evento) => {
      const botao = evento.target.closest('[data-acao="selecionar-foto-principal"]');
      if (!botao) return;
      const categoria = botao.dataset.categoria;
      const indice = Number(botao.dataset.indice);
      estado.fotoPrincipalAdicionais[categoria] = indice;
      persistir();
      botao.parentElement.querySelectorAll(".categoria-adicional-foto-botao").forEach((b) => {
        b.classList.toggle("selecionada", b === botao);
      });
      atualizarTvSeNecessario();
    });

    container.addEventListener("change", (evento) => {
      const alvo = evento.target;
      const categoria = alvo.dataset.categoria;
      const nome = alvo.dataset.nome;
      if (!categoria || !nome) return;

      if (alvo.dataset.acao === "toggle-adicional") {
        const linha = alvo.closest(".item-adicional");
        const inputValorFinal = linha.querySelector('[data-acao="valor-final-adicional"]');
        const inputQuantidade = linha.querySelector('[data-acao="quantidade-adicional"]');
        if (alvo.checked) {
          if (!adicionalSelecionado(categoria, nome)) {
            const categoriaCfg = CONFIG.catalogoAdicionais.find((c) => c.categoria === categoria);
            const itemCfg = categoriaCfg && categoriaCfg.itens.find((i) => i.nome === nome);
            let quantidade = itemCfg && itemCfg.quantidadePadrao != null ? itemCfg.quantidadePadrao : null;
            if (inputQuantidade && inputQuantidade.value !== "") quantidade = parseFloat(inputQuantidade.value) || 0;
            estado.adicionaisSelecionados.push({ categoria, nome, valorTotal: Number(alvo.dataset.valor) || 0, valorFinal: null, quantidade });
          }
          if (inputValorFinal) inputValorFinal.disabled = false;
          if (inputQuantidade) inputQuantidade.disabled = false;
        } else {
          estado.adicionaisSelecionados = estado.adicionaisSelecionados.filter(
            (a) => !(a.categoria === categoria && a.nome === nome)
          );
          if (inputValorFinal) {
            inputValorFinal.disabled = true;
            inputValorFinal.value = "";
          }
          if (inputQuantidade) inputQuantidade.disabled = true;
          const infoDesconto = linha.querySelector(".item-adicional-desconto-info");
          if (infoDesconto) infoDesconto.remove();
          const valorTotalSpan = linha.querySelector(".item-adicional-valor");
          if (valorTotalSpan) valorTotalSpan.classList.remove("com-desconto");
        }
        persistir();
        atualizarTotalAdicionais();
        atualizarTvSeNecessario();
      } else if (alvo.dataset.acao === "toggle-adicional-manual") {
        const linha = alvo.closest(".item-adicional");
        const inputValor = linha.querySelector('[data-acao="valor-adicional-manual"]');
        if (alvo.checked) {
          if (!adicionalSelecionado(categoria, nome)) {
            estado.adicionaisSelecionados.push({ categoria, nome, valorTotal: 0, valorFinal: null });
          }
          inputValor.disabled = false;
          inputValor.focus();
        } else {
          estado.adicionaisSelecionados = estado.adicionaisSelecionados.filter(
            (a) => !(a.categoria === categoria && a.nome === nome)
          );
          inputValor.disabled = true;
          inputValor.value = "";
        }
        persistir();
        atualizarTotalAdicionais();
        atualizarTvSeNecessario();
      }
    });

    container.addEventListener("input", (evento) => {
      const alvo = evento.target;
      if (alvo.dataset.acao === "quantidade-adicional") {
        const item = adicionalSelecionado(alvo.dataset.categoria, alvo.dataset.nome);
        if (!item) return;
        item.quantidade = alvo.value === "" ? null : parseFloat(alvo.value) || 0;
        persistir();
        atualizarTvSeNecessario();
      } else if (alvo.dataset.acao === "valor-adicional-manual") {
        const item = adicionalSelecionado(alvo.dataset.categoria, alvo.dataset.nome);
        if (!item) return;
        item.valorTotal = parseFloat(alvo.value) || 0;
        persistir();
        atualizarTotalAdicionais();
        atualizarTvSeNecessario();
      } else if (alvo.dataset.acao === "valor-final-adicional") {
        const item = adicionalSelecionado(alvo.dataset.categoria, alvo.dataset.nome);
        if (!item) return;
        item.valorFinal = alvo.value === "" ? null : parseFloat(alvo.value) || 0;
        persistir();
        atualizarTotalAdicionais();
        atualizarTvSeNecessario();

        // Atualiza só o "− Rx de desconto" e o risco no valor cheio, sem recriar o
        // input (recriá-lo durante a digitação faz o cursor voltar pro início e a
        // ordem dos números sair invertida).
        const linha = alvo.closest(".item-adicional");
        const categoriaCfg = CONFIG.catalogoAdicionais.find((c) => c.categoria === alvo.dataset.categoria);
        const itemCfg = categoriaCfg && categoriaCfg.itens.find((i) => i.nome === alvo.dataset.nome);
        if (linha && itemCfg) {
          const temDesconto = item.valorFinal != null && item.valorFinal !== itemCfg.valorReferencia;
          const valorTotalSpan = linha.querySelector(".item-adicional-valor");
          if (valorTotalSpan) valorTotalSpan.classList.toggle("com-desconto", temDesconto);
          let infoDesconto = linha.querySelector(".item-adicional-desconto-info");
          if (temDesconto) {
            const desconto = itemCfg.valorReferencia - item.valorFinal;
            if (!infoDesconto) {
              infoDesconto = document.createElement("span");
              infoDesconto.className = "item-adicional-desconto-info";
              linha.querySelector(".item-adicional-valor-final-campo").appendChild(infoDesconto);
            }
            infoDesconto.textContent = `− ${calc.formatarMoeda(desconto)}`;
          } else if (infoDesconto) {
            infoDesconto.remove();
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------------
  // Aba "Resumo" (resumo da compra)
  // ---------------------------------------------------------------------

  function htmlPilulasResumo() {
    const r = estado.resumoCompra;
    const pilulasPacote = Object.keys(CONFIG.pacotes)
      .map(
        (id) =>
          `<button type="button" class="resumo-pilula${r.pacoteEscolhido === id ? " selecionada" : ""}" data-acao="resumo-pacote" data-valor="${id}">${CONFIG.pacotes[id].nome}</button>`
      )
      .join("");

    let pilulasBebida = `<p class="resumo-vazio" style="padding:0.4rem 0;">Escolha o pacote primeiro</p>`;
    let pilulasPagamento = `<p class="resumo-vazio" style="padding:0.4rem 0;">Escolha o pacote primeiro</p>`;

    if (r.pacoteEscolhido) {
      const configPacote = CONFIG.pacotes[r.pacoteEscolhido];
      const estadoPacote = estado.pacotes[r.pacoteEscolhido];
      pilulasBebida = tiposAtivos(estadoPacote)
        .map(
          (tipo) =>
            `<button type="button" class="resumo-pilula${r.tipoBebidaEscolhido === tipo.id ? " selecionada" : ""}" data-acao="resumo-bebida" data-valor="${tipo.id}">${tipo.nome}</button>`
        )
        .join("");
      pilulasPagamento = configPacote.opcoesPagamento
        .map(
          (opcao) =>
            `<button type="button" class="resumo-pilula${r.opcaoPagamentoEscolhida === opcao.id ? " selecionada" : ""}" data-acao="resumo-pagamento" data-valor="${opcao.id}">${opcao.nome}</button>`
        )
        .join("");
    }

    return `
      <div class="resumo-selecoes">
        <div class="resumo-selecao-grupo">
          <span>Pacote</span>
          <div class="resumo-pilulas">${pilulasPacote}</div>
        </div>
        <div class="resumo-selecao-grupo">
          <span>Bebida</span>
          <div class="resumo-pilulas">${pilulasBebida}</div>
        </div>
        <div class="resumo-selecao-grupo">
          <span>Forma de pagamento</span>
          <div class="resumo-pilulas">${pilulasPagamento}</div>
        </div>
      </div>`;
  }

  function htmlDetalheResumo() {
    const dados = proposta.dadosResumoCompra(estado);
    if (!dados) {
      return `<p class="resumo-vazio">Escolha o pacote, a bebida e a forma de pagamento acima para ver o total.</p>`;
    }
    if (dados.avisoPacote) {
      return `<p class="resumo-vazio">${dados.avisoPacote}</p>`;
    }

    const adicionaisHtml = dados.adicionais.length
      ? dados.adicionais
          .map(
            (a) =>
              `<div class="resumo-linha-adicional"><span>${escaparHtml(a.categoria)} — ${escaparHtml(a.nome)}</span><span>${calc.formatarMoeda(a.valorExibido)}</span></div>`
          )
          .join("")
      : `<p class="resumo-vazio" style="padding:0.6rem 0;">Nenhum adicional selecionado.</p>`;

    return `
      <div class="resumo-linha-pacote">
        <span>${dados.pacoteNome} — ${dados.tipoNome} — ${dados.opcaoNome}${dados.detalhePacote ? ` (${dados.detalhePacote})` : ""}</span>
        <strong>${calc.formatarMoeda(dados.totalPacote)}</strong>
      </div>
      <div class="resumo-subtitulo">Adicionais selecionados</div>
      ${adicionaisHtml}
      <div class="resumo-total-geral">
        <span>Total geral</span>
        <strong>${calc.formatarMoeda(dados.totalGeral)}</strong>
      </div>`;
  }

  function montarAbaResumo() {
    const container = document.getElementById("aba-resumo");
    container.innerHTML = `
      <div class="resumo-cabecalho">
        <h1 class="pacote-titulo" style="font-size:1.8rem;">Resumo da compra</h1>
        <p>Escolha o pacote, a bebida e a forma de pagamento para fechar com o casal.</p>
      </div>
      ${htmlPilulasResumo()}
      <div class="resumo-detalhe">${htmlDetalheResumo()}</div>
    `;

    if (container.dataset.eventosLigados) return;
    container.dataset.eventosLigados = "1";

    container.addEventListener("click", (evento) => {
      const alvo = evento.target.closest("[data-acao]");
      if (!alvo) return;
      const r = estado.resumoCompra;

      if (alvo.dataset.acao === "resumo-pacote") {
        r.pacoteEscolhido = alvo.dataset.valor;
        r.tipoBebidaEscolhido = null;
        r.opcaoPagamentoEscolhida = null;
      } else if (alvo.dataset.acao === "resumo-bebida") {
        r.tipoBebidaEscolhido = alvo.dataset.valor;
      } else if (alvo.dataset.acao === "resumo-pagamento") {
        r.opcaoPagamentoEscolhida = alvo.dataset.valor;
      } else {
        return;
      }

      persistir();
      montarAbaResumo();
      atualizarTvSeNecessario();
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
    montarAbaAdicionais();
    montarAbaResumo();
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
    montarAbaAdicionais();
    montarAbaResumo();
    configurarAbas();
    configurarBotoesApresentacao();
    configurarFocoDePacote();
    configurarFocoDeAdicional();
    configurarExportacaoPdf();
    configurarPropostasSalvas();
    if (estado.cabecalho.nomeCasal) state.salvarComoProposta(estado);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
