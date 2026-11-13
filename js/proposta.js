// Cálculo de uma opção de pagamento para um tipo de bebida, a partir de um objeto de
// estado (ver state.js). Compartilhado entre o painel do vendedor, a exportação em PDF
// e a tela de Bem-Vindos espelhada, para nunca divergirem entre si.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./config.js"), require("./calc.js"), require("./state.js"));
  } else {
    root.MADZ_PROPOSTA = factory(root.MADZ_CONFIG, root.MADZ_CALC, root.MADZ_STATE);
  }
})(typeof self !== "undefined" ? self : this, function (CONFIG, calc, state) {
  const TIPOS_BEBIDA = [
    { id: "nacionais", nome: "Nacionais", classe: "card-nacional" },
    { id: "importados", nome: "Importadas", classe: "card-importada" },
    { id: "semAlcool", nome: "Sem álcool", classe: "card-sem-alcool" },
  ];

  function tiposAtivos(estadoPacote) {
    return TIPOS_BEBIDA.filter((t) => t.id !== "semAlcool" || estadoPacote.ativoSemAlcool);
  }

  function formatarDataBr(dataISO) {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function calcularOpcaoParaTipo(estado, idPacote, tipoId, opcao) {
    const estadoPacote = estado.pacotes[idPacote];
    const c = estado.cabecalho;
    const valorBase = estadoPacote.valoresPorConvidado[tipoId] || 0;
    const valorAjustado = calc.calcularValorAjustadoPorHoras(valorBase, c.tempoServicoHoras, {
      percentualPorHoraExtra: estadoPacote.percentualHoraExtra,
    });
    const percentualDesconto = estadoPacote.descontos[opcao.id] ?? opcao.percentualDesconto;
    const totalComDesconto = calc.calcularTotalComDesconto(valorAjustado, c.convidados, percentualDesconto);

    let detalhe = "";
    let aviso = null;
    let numeroParcelas = null;

    if (opcao.metodo === "entrada_saldo") {
      const { entrada, saldo } = calc.calcularEntradaSaldo(totalComDesconto, {
        percentualEntrada: CONFIG.pagamento.percentualEntrada,
      });
      const dataSaldo = c.dataEvento ? state.somarDiasISO(c.dataEvento, -CONFIG.pagamento.prazoSaldoDiasAntesDoEvento) : null;
      detalhe = `Entrada (${Math.round(CONFIG.pagamento.percentualEntrada * 100)}%): ${calc.formatarMoeda(entrada)} · Saldo${dataSaldo ? ` até ${formatarDataBr(dataSaldo)}` : ""}: ${calc.formatarMoeda(saldo)}`;
    } else if (opcao.metodo === "parcelas_fixas") {
      numeroParcelas = opcao.numeroParcelas;
      const { valorParcela } = calc.calcularParcelasFixas(totalComDesconto, numeroParcelas);
      detalhe = `${numeroParcelas}x de ${calc.formatarMoeda(valorParcela)}`;
    } else if (opcao.metodo === "boleto") {
      const resultado =
        c.dataFechamento && c.dataEvento
          ? calc.calcularNumeroParcelasBoleto(c.dataFechamento, c.dataEvento, {
              prazoDiasAntesDoEvento: CONFIG.pagamento.prazoBoletoDiasAntesDoEvento,
              teto: CONFIG.pagamento.tetoParcelasBoleto,
            })
          : { quantidade: 0 };
      numeroParcelas = Math.min(
        estadoPacote.numeroParcelasBoletoManual || resultado.quantidade,
        CONFIG.pagamento.tetoParcelasBoleto
      );
      if (numeroParcelas < 2) {
        aviso = "Prazo não permite boleto parcelado (menos de 2 parcelas); considere outra forma de pagamento.";
      } else {
        const { valorParcela } = calc.calcularParcelasFixas(totalComDesconto, numeroParcelas);
        detalhe = `${numeroParcelas}x de ${calc.formatarMoeda(valorParcela)}`;
      }
    }

    return { valorAjustado, totalComDesconto, detalhe, aviso, numeroParcelas };
  }

  function infoDrink(nome) {
    for (const grupo of CONFIG.catalogoDrinks) {
      const item = grupo.itens.find((i) => i.nome === nome);
      if (item) return item;
    }
    return null;
  }

  // Resumo do evento (cabeçalho + drinks/caipirinhas escolhidos) — usado na etapa de
  // abertura da apresentação, antes de entrar pacote a pacote.
  function dadosResumo(estado) {
    return {
      cabecalho: estado.cabecalho,
      drinks: estado.drinksSelecionados.map((nome) => {
        const info = infoDrink(nome);
        return { nome, autoral: Boolean(info && info.autoral) };
      }),
      caipirinhas: estado.caipirinhas.filter((c) => c.trim()),
    };
  }

  // Conteúdo completo de um pacote (descrição, inclui, cortesias e a tabela de
  // pagamento) — usado tanto na exportação em PDF quanto na TV espelhada.
  function dadosPacote(estado, idPacote) {
    const configPacote = CONFIG.pacotes[idPacote];
    const estadoPacote = estado.pacotes[idPacote];
    const tipos = tiposAtivos(estadoPacote);
    const linhas = configPacote.opcoesPagamento.map((opcao) => ({
      opcao,
      porTipo: Object.fromEntries(tipos.map((tipo) => [tipo.id, calcularOpcaoParaTipo(estado, idPacote, tipo.id, opcao)])),
    }));
    return {
      id: idPacote,
      nome: configPacote.nome,
      descricaoCurta: configPacote.descricaoCurta,
      inclui: configPacote.inclui,
      tipos,
      cortesias: estadoPacote.cortesias,
      valoresRevelados: Boolean(estadoPacote.valoresRevelados),
      linhas,
    };
  }

  return { TIPOS_BEBIDA, tiposAtivos, formatarDataBr, calcularOpcaoParaTipo, infoDrink, dadosResumo, dadosPacote };
});
