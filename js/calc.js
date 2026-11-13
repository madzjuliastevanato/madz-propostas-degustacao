// Núcleo de cálculo da proposta MADZ. Funções puras, sem efeitos colaterais e sem
// dependência de DOM ou de config.js — tudo que entra é parâmetro, tudo que sai é retorno.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MADZ_CALC = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  // --- Arredondamento -------------------------------------------------
  // Reais inteiros, 0,5 sempre para cima. Corrige ruído de ponto flutuante
  // (ex.: 25740 * 0.95 pode virar 24452.999999999996) antes de arredondar.
  function arredondarReais(valor) {
    const semRuido = Math.round(valor * 1e6) / 1e6;
    return Math.floor(semRuido + 0.5);
  }

  // --- Tempo de serviço -------------------------------------------------
  // valor_ajustado = valor_base × (1 + percentualPorHoraExtra × horasExtras), soma simples.
  function calcularValorAjustadoPorHoras(valorBasePorConvidado, horasServico, opcoes = {}) {
    const horasBase = opcoes.horasBase ?? 6;
    const percentualPorHoraExtra = opcoes.percentualPorHoraExtra ?? 0.15;
    const horasExtras = Math.max(0, horasServico - horasBase);
    return valorBasePorConvidado * (1 + percentualPorHoraExtra * horasExtras);
  }

  // --- Totais -------------------------------------------------
  // Total de tabela: valor ajustado × convidados, sem desconto. Valor exato (não arredondado),
  // útil para exibição e como base para o cálculo do total com desconto.
  function calcularTotalTabela(valorAjustadoPorConvidado, convidados) {
    return valorAjustadoPorConvidado * convidados;
  }

  // total_com_desconto = valor_ajustado × convidados × (1 − desconto), arredondado.
  function calcularTotalComDesconto(valorAjustadoPorConvidado, convidados, percentualDesconto) {
    const totalTabela = calcularTotalTabela(valorAjustadoPorConvidado, convidados);
    return arredondarReais(totalTabela * (1 - percentualDesconto));
  }

  // --- Entrada + saldo -------------------------------------------------
  // Entrada = percentual (padrão 30%) do total com desconto, arredondada.
  // Saldo = total − entrada já arredondada, para a soma fechar certinho.
  function calcularEntradaSaldo(totalComDesconto, opcoes = {}) {
    const percentualEntrada = opcoes.percentualEntrada ?? 0.30;
    const entrada = arredondarReais(totalComDesconto * percentualEntrada);
    const saldo = totalComDesconto - entrada;
    return { entrada, saldo };
  }

  // --- Parcelas de valor fixo (ex.: 2 parcelas) -------------------------------------------------
  function calcularParcelasFixas(totalComDesconto, numeroParcelas) {
    const valorParcela = arredondarReais(totalComDesconto / numeroParcelas);
    return { numeroParcelas, valorParcela };
  }

  // --- Datas (apenas calendário, sem fuso/feriados) -------------------------------------------------
  function paraDataCalendario(entrada) {
    if (entrada instanceof Date) {
      return new Date(Date.UTC(entrada.getFullYear(), entrada.getMonth(), entrada.getDate()));
    }
    const [ano, mes, dia] = String(entrada).split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  }

  function adicionarMeses(dataCalendario, meses) {
    const ano = dataCalendario.getUTCFullYear();
    const mes = dataCalendario.getUTCMonth();
    const dia = dataCalendario.getUTCDate();
    const alvo = new Date(Date.UTC(ano, mes + meses, 1));
    const ultimoDiaDoMesAlvo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(dia, ultimoDiaDoMesAlvo));
    return alvo;
  }

  function subtrairDias(dataCalendario, dias) {
    return new Date(dataCalendario.getTime() - dias * 24 * 60 * 60 * 1000);
  }

  // --- Número de parcelas no boleto -------------------------------------------------
  // O evento precisa estar quitado até `prazoDiasAntesDoEvento` dias antes da data do evento.
  // Vencimentos mensais começando na data de fechamento, repetindo o mesmo dia de cada mês,
  // contando os que caem até esse prazo. Teto de `teto` parcelas.
  function calcularNumeroParcelasBoleto(dataFechamento, dataEvento, opcoes = {}) {
    const prazoDiasAntesDoEvento = opcoes.prazoDiasAntesDoEvento ?? 15;
    const teto = opcoes.teto ?? 10;
    const LIMITE_ITERACOES = 60; // salvaguarda: nenhuma proposta real passa de 60 vencimentos mensais

    const fechamento = paraDataCalendario(dataFechamento);
    const prazo = subtrairDias(paraDataCalendario(dataEvento), prazoDiasAntesDoEvento);

    let quantidadeBruta = 0;
    for (let i = 0; i < LIMITE_ITERACOES; i++) {
      const vencimento = adicionarMeses(fechamento, i);
      if (vencimento.getTime() <= prazo.getTime()) {
        quantidadeBruta = i + 1;
      } else {
        break;
      }
    }

    const quantidade = Math.min(quantidadeBruta, teto);
    return {
      quantidadeBruta,
      quantidade,
      excedeuTeto: quantidadeBruta > teto,
      abaixoDeDois: quantidade < 2,
    };
  }

  // --- Formatação (reais, padrão brasileiro) -------------------------------------------------
  function formatarMoeda(valor, opcoes = {}) {
    const comCentavos = opcoes.comCentavos ?? false;
    const numero = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: comCentavos ? 2 : 0,
      maximumFractionDigits: comCentavos ? 2 : 0,
    }).format(valor);
    return `R$ ${numero}`;
  }

  return {
    arredondarReais,
    calcularValorAjustadoPorHoras,
    calcularTotalTabela,
    calcularTotalComDesconto,
    calcularEntradaSaldo,
    calcularParcelasFixas,
    calcularNumeroParcelasBoleto,
    formatarMoeda,
  };
});
