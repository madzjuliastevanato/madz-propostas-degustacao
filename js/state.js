// Estado da proposta: valores padrão, clonagem, salvamento automático no localStorage,
// lista de propostas salvas e sincronização com a tela de Bem-Vindos.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./config.js"));
  } else {
    root.MADZ_STATE = factory(root.MADZ_CONFIG);
  }
})(typeof self !== "undefined" ? self : this, function (CONFIG) {
  const CHAVE_ATUAL = "madz:proposta_atual";
  const CHAVE_LISTA = "madz:propostas_lista";
  const CHAVE_PROPOSTA = (id) => `madz:proposta:${id}`;
  const CANAL_BEMVINDOS = "madz-bemvindos";
  const CHAVE_SYNC_BEMVINDOS = "madz:sync_bemvindos";

  function gerarId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function hojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function somarDiasISO(dataISO, dias) {
    const [ano, mes, dia] = dataISO.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    data.setUTCDate(data.getUTCDate() + dias);
    const y = data.getUTCFullYear();
    const m = String(data.getUTCMonth() + 1).padStart(2, "0");
    const d = String(data.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function clonar(objeto) {
    return JSON.parse(JSON.stringify(objeto));
  }

  function criarPacotePadrao(idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const descontos = {};
    configPacote.opcoesPagamento.forEach((op) => {
      descontos[op.id] = op.percentualDesconto;
    });
    return {
      ativoSemAlcool: false,
      valoresPorConvidado: { ...configPacote.precosPorConvidado6h },
      percentualHoraExtra: CONFIG.horas.percentualPorHoraExtraPadrao,
      descontos,
      numeroParcelasBoletoManual: null,
      cortesiasReveladas: false,
      valoresRevelados: false,
      cortesias: [],
    };
  }

  function criarPadrao() {
    const hoje = hojeISO();
    const pacotes = {};
    Object.keys(CONFIG.pacotes).forEach((id) => {
      pacotes[id] = criarPacotePadrao(id);
    });
    return {
      id: gerarId(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      cabecalho: {
        nomeCasal: "",
        dataEvento: "",
        local: "",
        tempoServicoHoras: CONFIG.horas.base,
        convidados: 100,
        assessoria: "",
        dataFechamento: hoje,
        validadeProposta: somarDiasISO(hoje, CONFIG.validadePropostaDiasPadrao),
      },
      // Drinks e caipirinhas são escolhidos uma vez pelo casal e valem para os 3 pacotes
      // (só o limite de contagem exibido muda por pacote).
      drinksSelecionados: [],
      caipirinhas: ["", ""],
      // Adicionais marcados na vitrine, independente do pacote (mesma lógica dos drinks).
      // Cada item: { categoria, nome, valorTotal, valorFinal }.
      adicionaisSelecionados: [],
      // Qual foto de cada categoria está em destaque (índice no array "fotos" do
      // config) — o vendedor troca clicando nas miniaturas; a TV mostra essa como
      // a foto principal da galeria. Categoria sem entrada aqui usa a primeira foto.
      fotoPrincipalAdicionais: {},
      // Escolha final para o resumo da compra — preenchida na aba "Resumo".
      resumoCompra: {
        pacoteEscolhido: null,
        tipoBebidaEscolhido: null,
        opcaoPagamentoEscolhida: null,
      },
      pacotes,
    };
  }

  // --- Armazenamento (localStorage) -------------------------------------------------

  function temLocalStorage() {
    try {
      return typeof localStorage !== "undefined";
    } catch (e) {
      return false;
    }
  }

  function salvarAtual(estado) {
    if (!temLocalStorage()) return;
    try {
      localStorage.setItem(CHAVE_ATUAL, JSON.stringify(estado));
    } catch (e) {
      console.error("Não foi possível salvar automaticamente:", e);
    }
  }

  function carregarAtual() {
    if (!temLocalStorage()) return null;
    try {
      const bruto = localStorage.getItem(CHAVE_ATUAL);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      console.error("Não foi possível carregar o salvamento automático:", e);
      return null;
    }
  }

  function lerLista() {
    if (!temLocalStorage()) return [];
    try {
      const bruto = localStorage.getItem(CHAVE_LISTA);
      return bruto ? JSON.parse(bruto) : [];
    } catch (e) {
      return [];
    }
  }

  function gravarLista(lista) {
    if (!temLocalStorage()) return;
    localStorage.setItem(CHAVE_LISTA, JSON.stringify(lista));
  }

  function listarPropostas() {
    return lerLista().sort((a, b) => (a.atualizadoEm < b.atualizadoEm ? 1 : -1));
  }

  function salvarComoProposta(estado) {
    if (!temLocalStorage()) return;
    const agora = new Date().toISOString();
    estado.atualizadoEm = agora;
    localStorage.setItem(CHAVE_PROPOSTA(estado.id), JSON.stringify(estado));

    const lista = lerLista();
    const indice = lista.findIndex((item) => item.id === estado.id);
    const metadados = {
      id: estado.id,
      nomeCasal: estado.cabecalho.nomeCasal || "(sem nome)",
      dataEvento: estado.cabecalho.dataEvento || "",
      atualizadoEm: agora,
    };
    if (indice >= 0) {
      lista[indice] = metadados;
    } else {
      lista.push(metadados);
    }
    gravarLista(lista);
  }

  function abrirProposta(id) {
    if (!temLocalStorage()) return null;
    const bruto = localStorage.getItem(CHAVE_PROPOSTA(id));
    return bruto ? JSON.parse(bruto) : null;
  }

  function duplicarProposta(id) {
    const original = abrirProposta(id);
    if (!original) return null;
    const copia = clonar(original);
    copia.id = gerarId();
    copia.criadoEm = new Date().toISOString();
    copia.cabecalho.nomeCasal = original.cabecalho.nomeCasal
      ? `${original.cabecalho.nomeCasal} (cópia)`
      : "(cópia)";
    salvarComoProposta(copia);
    return copia;
  }

  function excluirProposta(id) {
    if (!temLocalStorage()) return;
    localStorage.removeItem(CHAVE_PROPOSTA(id));
    gravarLista(lerLista().filter((item) => item.id !== id));
  }

  // --- Sincronização com a tela de Bem-Vindos -------------------------------------------------
  // BroadcastChannel entre janelas da mesma origem, com localStorage como reserva
  // (ex.: navegadores sem suporte, ou quando as janelas não compartilham o mesmo processo).

  function criarCanalBemVindos() {
    const temBroadcast = typeof BroadcastChannel !== "undefined";
    const canal = temBroadcast ? new BroadcastChannel(CANAL_BEMVINDOS) : null;

    function enviar(dados) {
      if (canal) {
        canal.postMessage(dados);
      }
      if (temLocalStorage()) {
        try {
          localStorage.setItem(CHAVE_SYNC_BEMVINDOS, JSON.stringify({ ...dados, _ts: Date.now() }));
        } catch (e) {
          // ignora — o BroadcastChannel já cobre o caso comum
        }
      }
    }

    function escutar(callback) {
      if (canal) {
        canal.onmessage = (evento) => callback(evento.data);
      }
      if (temLocalStorage()) {
        window.addEventListener("storage", (evento) => {
          if (evento.key === CHAVE_SYNC_BEMVINDOS && evento.newValue) {
            try {
              callback(JSON.parse(evento.newValue));
            } catch (e) {
              // ignora payload inválido
            }
          }
        });
      }
    }

    function estadoInicial() {
      if (!temLocalStorage()) return null;
      try {
        const bruto = localStorage.getItem(CHAVE_SYNC_BEMVINDOS);
        return bruto ? JSON.parse(bruto) : null;
      } catch (e) {
        return null;
      }
    }

    return { enviar, escutar, estadoInicial };
  }

  function debounce(fn, atrasoMs) {
    let temporizador = null;
    return function (...args) {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn.apply(null, args), atrasoMs);
    };
  }

  return {
    hojeISO,
    somarDiasISO,
    clonar,
    criarPadrao,
    salvarAtual,
    carregarAtual,
    listarPropostas,
    salvarComoProposta,
    abrirProposta,
    duplicarProposta,
    excluirProposta,
    criarCanalBemVindos,
    debounce,
  };
});
