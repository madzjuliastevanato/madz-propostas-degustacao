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
    const totalTabela = calc.arredondarReais(calc.calcularTotalTabela(valorAjustado, c.convidados));
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

    return { valorAjustado, totalTabela, totalComDesconto, detalhe, aviso, numeroParcelas };
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
      valoresPorPessoaRevelados: Boolean(estadoPacote.valoresPorPessoaRevelados),
      cortesiasReveladas: Boolean(estadoPacote.cortesiasReveladas),
      valoresRevelados: Boolean(estadoPacote.valoresRevelados),
      linhas,
    };
  }

  // Catálogo de adicionais "achatado" (sem agrupar por categoria) — usado nas
  // sugestões do campo livre de cortesias.
  function itensAdicionaisPlano() {
    return CONFIG.catalogoAdicionais.flatMap((categoria) =>
      categoria.itens.map((item) => ({ ...item, categoria: categoria.categoria }))
    );
  }

  // Valor que de fato conta para o total: o valor final (com desconto), quando o
  // vendedor preencheu um; senão o valor total (cheio) do item.
  function valorEfetivoAdicional(adicional) {
    return adicional.valorFinal != null ? adicional.valorFinal : adicional.valorTotal;
  }

  // Nome exibido de um adicional selecionado: quando o item tem uma quantidade
  // editável (ex.: Shots), acrescenta "(N shots)" ao nome, usando a quantidade
  // escolhida pelo vendedor.
  function nomeExibidoAdicional(nomeCategoria, nomeItem, quantidade) {
    const categoria = CONFIG.catalogoAdicionais.find((c) => c.categoria === nomeCategoria);
    const itemCfg = categoria && categoria.itens.find((i) => i.nome === nomeItem);
    if (itemCfg && itemCfg.unidadeQuantidade && quantidade != null) {
      return `${nomeItem} (${quantidade} ${itemCfg.unidadeQuantidade})`;
    }
    return nomeItem;
  }

  // Resumo da compra: pacote + bebida + forma de pagamento escolhidos na aba
  // "Resumo", somados aos adicionais marcados na vitrine. Retorna null enquanto
  // a escolha não estiver completa.
  function dadosResumoCompra(estado) {
    const r = estado.resumoCompra;
    if (!r || !r.pacoteEscolhido || !r.tipoBebidaEscolhido || !r.opcaoPagamentoEscolhida) return null;
    const configPacote = CONFIG.pacotes[r.pacoteEscolhido];
    if (!configPacote) return null;
    const opcao = configPacote.opcoesPagamento.find((o) => o.id === r.opcaoPagamentoEscolhida);
    if (!opcao) return null;
    const tipoInfo = TIPOS_BEBIDA.find((t) => t.id === r.tipoBebidaEscolhido);
    const resultado = calcularOpcaoParaTipo(estado, r.pacoteEscolhido, r.tipoBebidaEscolhido, opcao);
    const adicionais = estado.adicionaisSelecionados.map((a) => ({
      ...a,
      nome: nomeExibidoAdicional(a.categoria, a.nome, a.quantidade),
      valorOriginal: a.valorTotal,
      valorExibido: valorEfetivoAdicional(a),
    }));
    const totalAdicionais = adicionais.reduce((soma, a) => soma + (a.valorExibido || 0), 0);
    const cortesias = (estado.pacotes[r.pacoteEscolhido].cortesias || []).map((c) => ({
      nome: c.nome,
      valorReferencia: c.valorReferencia != null ? c.valorReferencia : null,
    }));

    return {
      nomeCasal: estado.cabecalho.nomeCasal,
      pacoteNome: configPacote.nome,
      pacoteInclui: configPacote.inclui,
      tipoNome: tipoInfo ? tipoInfo.nome : r.tipoBebidaEscolhido,
      opcaoNome: opcao.nome,
      totalPacote: resultado.totalComDesconto,
      totalPacoteOriginal: resultado.totalTabela,
      detalhePacote: resultado.detalhe,
      avisoPacote: resultado.aviso,
      cortesias,
      adicionais,
      totalAdicionais,
      totalGeral: resultado.aviso ? null : resultado.totalComDesconto + totalAdicionais,
    };
  }

  // Índice da foto que deve aparecer em destaque para essa categoria — o vendedor
  // escolhe clicando nas miniaturas; sem escolha, é a primeira foto do catálogo.
  function indiceFotoPrincipal(estado, nomeCategoria, totalFotos) {
    const indice = estado.fotoPrincipalAdicionais ? estado.fotoPrincipalAdicionais[nomeCategoria] : undefined;
    return typeof indice === "number" && indice >= 0 && indice < totalFotos ? indice : 0;
  }

  // Conteúdo de uma categoria de adicionais (fotos + itens com preço) para a TV
  // espelhada, enquanto a aba "Adicionais" está em foco. A foto em destaque (ver
  // indiceFotoPrincipal) vem primeiro no array — é essa que a TV mostra grande.
  function dadosCategoriaAdicional(estado, nomeCategoria) {
    const categoria = CONFIG.catalogoAdicionais.find((c) => c.categoria === nomeCategoria);
    if (!categoria) return null;
    const itens = categoria.itens.map((item) => {
      const selecionado = estado.adicionaisSelecionados.find(
        (a) => a.categoria === nomeCategoria && a.nome === item.nome
      );
      let valorExibido;
      let porConvidado = false;
      if (item.valorPorConvidado != null) {
        if (selecionado) {
          valorExibido = valorEfetivoAdicional(selecionado);
        } else {
          valorExibido = item.valorPorConvidado;
          porConvidado = true;
        }
      } else {
        valorExibido = selecionado ? valorEfetivoAdicional(selecionado) : item.valorReferencia;
      }
      const nome = selecionado
        ? nomeExibidoAdicional(nomeCategoria, item.nome, selecionado.quantidade)
        : item.nome;
      return { nome, valorExibido, selecionado: Boolean(selecionado), porConvidado };
    });
    const indicePrincipal = indiceFotoPrincipal(estado, nomeCategoria, categoria.fotos.length);
    const fotos = categoria.fotos.map((src, indice) => ({ src, principal: indice === indicePrincipal }));
    const fotosOrdenadas = [...fotos].sort((a, b) => (a.principal === b.principal ? 0 : a.principal ? -1 : 1)).map((f) => f.src);
    return { categoria: categoria.categoria, explicacao: categoria.explicacao, fotos: fotosOrdenadas, itens };
  }

  // Conteúdo de uma categoria do portfólio de estruturas de bar (fotos +
  // formatos de montagem) para a TV espelhada, enquanto a aba "Portfólio" está
  // em foco. Pura vitrine, sem preço nem seleção — mesma lógica de foto em
  // destaque da aba Adicionais (compartilha fotoPrincipalAdicionais por nome
  // de categoria).
  function dadosCategoriaPortfolio(estado, nomeCategoria) {
    const categoria = CONFIG.catalogoPortfolio.find((c) => c.categoria === nomeCategoria);
    if (!categoria) return null;
    const indicePrincipal = indiceFotoPrincipal(estado, nomeCategoria, categoria.fotos.length);
    const fotos = categoria.fotos.map((src, indice) => ({ src, principal: indice === indicePrincipal }));
    const fotosOrdenadas = [...fotos].sort((a, b) => (a.principal === b.principal ? 0 : a.principal ? -1 : 1)).map((f) => f.src);
    return {
      categoria: categoria.categoria,
      explicacao: categoria.explicacao,
      layouts: categoria.layouts,
      fotos: fotosOrdenadas,
    };
  }

  return {
    TIPOS_BEBIDA,
    tiposAtivos,
    formatarDataBr,
    calcularOpcaoParaTipo,
    infoDrink,
    dadosResumo,
    dadosPacote,
    itensAdicionaisPlano,
    valorEfetivoAdicional,
    nomeExibidoAdicional,
    dadosResumoCompra,
    dadosCategoriaAdicional,
    dadosCategoriaPortfolio,
    indiceFotoPrincipal,
  };
});
