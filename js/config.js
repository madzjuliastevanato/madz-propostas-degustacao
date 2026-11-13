// Configuração editável: preços, descontos, cortesias e catálogo de drinks.
// Não tem lógica de cálculo aqui — isso fica em calc.js.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MADZ_CONFIG = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const CONFIG = {
    horas: {
      base: 6,
      percentualPorHoraExtraPadrao: 0.15,
    },

    pagamento: {
      percentualEntrada: 0.30,
      prazoSaldoDiasAntesDoEvento: 15,
      prazoBoletoDiasAntesDoEvento: 15,
      tetoParcelasBoleto: 10,
    },

    validadePropostaDiasPadrao: 10,

    pacotes: {
      signature: {
        id: "signature",
        nome: "Signature",
        descricaoCurta: "8 coquetéis + 2 caipirinhas gourmet",
        inclui: [
          "8 coquetéis à escolha",
          "2 caipirinhas gourmet",
          "Uniforme Black Tie",
          "1 bartender extra",
          "Copos e taças de vidro",
        ],
        coqueteis: 8,
        caipirinhasGourmet: 2,
        limiteDrinks: 8,
        precosPorConvidado6h: {
          semAlcool: 81,
          nacionais: 104,
          importados: 134,
        },
        opcoesPagamento: [
          { id: "entrada_saldo", nome: "Entrada + saldo", metodo: "entrada_saldo", percentualDesconto: 0.05 },
          { id: "boleto", nome: "Boleto em Nx", metodo: "boleto", percentualDesconto: 0.10 },
          { id: "duas_parcelas", nome: "2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.15 },
          { id: "avista", nome: "À vista", metodo: "avista", percentualDesconto: 0.20 },
        ],
      },

      elegance: {
        id: "elegance",
        nome: "Elegance",
        descricaoCurta: "6 coquetéis + 2 caipirinhas gourmet",
        inclui: [
          "6 coquetéis à escolha",
          "2 caipirinhas gourmet",
          "Uniforme padrão",
          "Copos e taças de vidro",
        ],
        coqueteis: 6,
        caipirinhasGourmet: 2,
        limiteDrinks: 6,
        precosPorConvidado6h: {
          semAlcool: 71,
          nacionais: 86,
          importados: 109,
        },
        opcoesPagamento: [
          { id: "entrada_saldo", nome: "Entrada + saldo", metodo: "entrada_saldo", percentualDesconto: 0.00 },
          { id: "boleto", nome: "Boleto em Nx", metodo: "boleto", percentualDesconto: 0.05 },
          { id: "duas_parcelas", nome: "2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.10 },
          { id: "avista", nome: "À vista", metodo: "avista", percentualDesconto: 0.15 },
        ],
      },

      select: {
        id: "select",
        nome: "Select",
        descricaoCurta: "4 coquetéis + 2 caipirinhas gourmet",
        inclui: [
          "4 coquetéis à escolha",
          "2 caipirinhas gourmet",
          "Uniforme padrão",
          "Copos e taças de vidro",
        ],
        coqueteis: 4,
        caipirinhasGourmet: 2,
        limiteDrinks: 4,
        precosPorConvidado6h: {
          semAlcool: 63,
          nacionais: 72,
          importados: 91,
        },
        opcoesPagamento: [
          { id: "entrada_saldo", nome: "Entrada + saldo", metodo: "entrada_saldo", percentualDesconto: 0.00 },
          // Select não tem opção de boleto em Nx, de propósito (incentiva os outros pacotes).
          { id: "duas_parcelas", nome: "2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.05 },
          { id: "avista", nome: "À vista", metodo: "avista", percentualDesconto: 0.10 },
        ],
      },
    },

    // Catálogo de adicionais com valor de referência (sugestões de cortesia, campo continua livre).
    catalogoAdicionais: [
      { nome: "Whiskeria (2 rótulos à escolha)", valorReferencia: 4000, observacao: "carrinho opcional +1.000" },
      { nome: "Torre de taças", valorReferencia: 800 },
      { nome: "Welcome drink: suqueiras com 3 drinks", valorReferencia: 1500 },
      { nome: "Welcome drink: gelo floral com espumante saborizado", valorReferencia: 1900 },
      { nome: "Welcome drink: gelo floral com drink spritz", valorReferencia: 2500 },
      { nome: "Shots Mini Beer (50 shots)", valorReferencia: 500 },
      { nome: "Shots Carajillo (80 shots)", valorReferencia: 800 },
      { nome: "Régua de tequila (1 garrafa)", valorReferencia: 350 },
      { nome: "Coffee bar (por convidado, junto com o bar)", valorReferencia: null, observacao: "R$ 40 / 42 / 45 por convidado" },
      { nome: "Views: Espelho Mágico", valorReferencia: 2200 },
      { nome: "Views: Totem Retrô", valorReferencia: 1890 },
      { nome: "Views: Polaroid + Guest Book", valorReferencia: 2190 },
      { nome: "Mão de obra extra (Black Tie)", valorReferencia: 350 },
      { nome: "Upgrade do Gin Seagers para Gordon's", valorReferencia: 1200 },
      { nome: "Estrutura de bar (reto, \"U\", ilha) — Boiserie verde/branco/azul, Ripado, Treliça", valorReferencia: null, observacao: "sem valor fixo" },
    ],

    // Carta de Coquetéis 2027. Todos podem ser feitos alcoólicos ou não alcoólicos, exceto os mocktails.
    catalogoDrinks: [
      { destilado: "Gin", itens: [
        { nome: "Bramble" }, { nome: "Fitzgerald" }, { nome: "John Collins" }, { nome: "Trio Gin" },
        { nome: "Negroni" }, { nome: "Pitaya Cream", autoral: true }, { nome: "Salted Negroni" },
        { nome: "Velvety Orange", autoral: true }, { nome: "Basil Smash" },
      ]},
      { destilado: "Tequila", itens: [
        { nome: "Margarita" }, { nome: "Mexican Mango", autoral: true },
      ]},
      { destilado: "Vodka", itens: [
        { nome: "Amor(a) Julie", autoral: true }, { nome: "Cosmopolitan" }, { nome: "Hot Passion", autoral: true },
        { nome: "Lollipop", autoral: true }, { nome: "Moscow Mule" }, { nome: "Red Symphony", autoral: true },
      ]},
      { destilado: "Ramazzotti", itens: [
        { nome: "Ramazzotti Spritz", autoral: true },
      ]},
      { destilado: "Lillet", itens: [
        { nome: "Lillet Tonic" }, { nome: "Fresh Hibiscus", autoral: true },
      ]},
      { destilado: "Licores", itens: [
        { nome: "Alexander" }, { nome: "Caribe" }, { nome: "Marula Passion" },
      ]},
      { destilado: "Whisky", itens: [
        { nome: "Whisky Lemonade", autoral: true }, { nome: "Whisky Sour", observacao: "releitura" },
        { nome: "Cherry Bourbon", autoral: true }, { nome: "Kentuchy Mule" },
        { nome: "Mint Bourbon", autoral: true }, { nome: "Penicillin" }, { nome: "Boulevardier" },
      ]},
      { destilado: "Aperol", itens: [
        { nome: "Aperol Spritz" }, { nome: "Nonnatine", autoral: true }, { nome: "Red Flower", autoral: true },
      ]},
      { destilado: "Cachaça", itens: [
        { nome: "Cajuzeiro", autoral: true }, { nome: "Amaretto Spice", autoral: true },
      ]},
      { destilado: "Rum", itens: [
        { nome: "Mojito" }, { nome: "Tropical Honey", autoral: true },
      ]},
      { destilado: "Mocktails", semAlcoolApenas: true, itens: [
        { nome: "Fresh Grape" }, { nome: "Sunrise" }, { nome: "Azedinha" }, { nome: "Barbie" },
        { nome: "Cotton Candy" }, { nome: "Yellow" }, { nome: "Malibu Spritz" }, { nome: "Blue Sky" },
      ]},
    ],
  };

  return CONFIG;
});
