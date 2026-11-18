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

    // Marcas inclusas em cada tipo de bebida, iguais para todos os pacotes.
    rotulosBebidas: {
      nacionais: "Vodka Smirnoff, Saquê Azuma Kirin, Cachaça Sagatiba e Velho Barreiro, Rum Bacardi Carta Blanca, Gin Seagers, H2Oh e Água Mineral",
      importados: "Vodka Absolut, Saquê Azuma Kirin, Cachaça 1922, Rum Havana Club, Gin Tanqueray, H2Oh e Água Mineral",
    },

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

    // Catálogo de adicionais, organizado por categoria — usado na vitrine da aba
    // "Adicionais" (cada categoria vira um bloco com explicação, fotos e itens com
    // valor) e também como sugestão para o campo livre de cortesias.
    // "fotos" é uma lista de caminhos (ex.: "assets/adicionais/welcome-drink-1.jpg");
    // enquanto vazia, a vitrine mostra um espaço reservado no lugar da foto.
    catalogoAdicionais: [
      {
        categoria: "Welcome Drink",
        explicacao: "Um drink de boas-vindas servido assim que os convidados chegam — a primeira experiência de coquetelaria da festa.",
        fotos: [
          "assets/adicionais/welcome-drink-gelo-floral-1.jpg",
          "assets/adicionais/welcome-drink-gelo-floral-2.jpg",
          "assets/adicionais/welcome-drink-gelo-floral-3.jpg",
          "assets/adicionais/welcome-drink-gelo-floral-4.jpg",
          "assets/adicionais/welcome-drink-suqueira-1.jpg",
          "assets/adicionais/welcome-drink-suqueira-2.jpg",
        ],
        itens: [
          { nome: "Suqueiras com 3 drinks", valorReferencia: 1500 },
          { nome: "Gelo floral com espumante saborizado", valorReferencia: 1900 },
          { nome: "Gelo floral com drink spritz", valorReferencia: 2500 },
        ],
      },
      {
        categoria: "Whiskeria",
        explicacao: "Um carrinho com rótulos de whisky à escolha do casal, para os convidados degustarem ao longo da festa.",
        fotos: [],
        itens: [
          { nome: "Whiskeria + fornecimento de rótulos", valorReferencia: 4000 },
          { nome: "Whiskeria: serviço de defumação", valorReferencia: 1000 },
          { nome: "Carrinho (opcional)", valorReferencia: 1000 },
        ],
      },
      {
        categoria: "Torre de Taças",
        explicacao: "Uma torre de taças de espumante montada ao vivo — um momento visual para o brinde.",
        fotos: [
          "assets/adicionais/torre-de-tacas-1.jpg",
          "assets/adicionais/torre-de-tacas-2.jpg",
          "assets/adicionais/torre-de-tacas-4.jpg",
        ],
        itens: [{ nome: "Torre de taças", valorReferencia: 800 }],
      },
      {
        categoria: "Shots",
        explicacao: "Shots servidos em bandeja, circulando entre os convidados — uma forma descontraída de energizar a festa.",
        fotos: [
          "assets/adicionais/shots-mini-beer-1.jpg",
          "assets/adicionais/shots-mini-beer-3.jpg",
          "assets/adicionais/shots-mini-beer-4.jpg",
          "assets/adicionais/shots-carajillo-1.jpg",
        ],
        itens: [
          { nome: "Shots Mini Beer", valorReferencia: 500, quantidadePadrao: 50, unidadeQuantidade: "shots" },
          { nome: "Shots Carajillo", valorReferencia: 800, quantidadePadrao: 80, unidadeQuantidade: "shots" },
        ],
      },
      {
        categoria: "Régua de Tequila",
        explicacao: "Uma régua de doses de tequila, servida em grupo, para brindar com os convidados mais próximos.",
        fotos: ["assets/adicionais/regua-de-tequila-1.jpg", "assets/adicionais/regua-de-tequila-2.jpg"],
        itens: [{ nome: "Régua de tequila (1 garrafa)", valorReferencia: 350 }],
      },
      {
        categoria: "Coffee Bar",
        explicacao: "Um espaço de café e drinks quentes, montado junto ao bar, para fechar a noite.",
        fotos: [],
        itens: [
          { nome: "Opção 1: 3 coffee shakes", valorPorConvidado: 40 },
          { nome: "Opção 2: 3 coffee shakes + frappuccinos e expressos", valorPorConvidado: 42 },
          { nome: "Opção 3: 3 coffee shakes + frappuccinos e expressos + alcoólicos", valorPorConvidado: 45 },
        ],
      },
      {
        categoria: "Views",
        explicacao: "Instalações pensadas para registrar e entreter — um ponto de interação que os convidados levam para casa.",
        fotos: [
          "assets/adicionais/views-espelho-magico-1.jpg",
          "assets/adicionais/views-espelho-magico-2.jpg",
          "assets/adicionais/views-espelho-magico-3.jpg",
          "assets/adicionais/views-totem-retro-1.jpg",
          "assets/adicionais/views-polaroid-1.jpg",
        ],
        itens: [
          { nome: "Espelho Mágico", valorReferencia: 2200 },
          { nome: "Totem Retrô", valorReferencia: 1890 },
          { nome: "Polaroid + Guest Book", valorReferencia: 2190 },
          { nome: "Guest Book", valorReferencia: 500 },
        ],
      },
      {
        categoria: "Mão de Obra Extra",
        explicacao: "Reforço na equipe para eventos maiores ou com demanda extra de atendimento.",
        fotos: [],
        itens: [{ nome: "Mão de obra extra", valorReferencia: 350 }],
      },
      {
        categoria: "Upgrade de Bebida",
        explicacao: "Troca do rótulo padrão por uma versão superior, para elevar ainda mais o nível do bar.",
        fotos: [],
        itens: [{ nome: "Upgrade do Gin Seagers para Gordon's", valorReferencia: 1200 }],
      },
      {
        categoria: "Papel de Arroz",
        explicacao: "Papel de arroz para a saída do casal — um fechamento simples e tradicional da festa.",
        fotos: [],
        itens: [{ nome: "Papel de arroz", valorReferencia: 250 }],
      },
    ],

    // Portfólio de estruturas de bar — vitrine de fotos para o vendedor mostrar
    // ao casal (sem preço: estrutura de bar não tem valor fixo). "layouts" são os
    // formatos de montagem possíveis dessa estrutura (reto, "U", ilha).
    catalogoPortfolio: [
      {
        categoria: "Ripado",
        explicacao: "Estrutura em ripas de madeira com acabamento amadeirado — um visual quente e natural para o bar.",
        layouts: ["Formato reto", "Formato \"U\"", "Formato Ilha"],
        fotos: [
          "assets/portfolio/ripado-1.jpg",
          "assets/portfolio/ripado-2.jpg",
          "assets/portfolio/ripado-3.jpg",
          "assets/portfolio/ripado-4.jpg",
          "assets/portfolio/ripado-5.jpg",
        ],
      },
      {
        categoria: "Boiserie Verde",
        explicacao: "Estrutura com painéis em boiserie na cor verde — um acabamento clássico e elegante.",
        layouts: ["Formato reto", "Formato \"U\"", "Formato Ilha"],
        fotos: [
          "assets/portfolio/boiserie-verde-1.jpg",
          "assets/portfolio/boiserie-verde-2.jpg",
          "assets/portfolio/boiserie-verde-3.jpg",
          "assets/portfolio/boiserie-verde-4.jpg",
          "assets/portfolio/boiserie-verde-5.jpg",
        ],
      },
      {
        categoria: "Boiserie Branco",
        explicacao: "Estrutura com painéis em boiserie na cor branca — combina com qualquer paleta de decoração.",
        layouts: ["Formato reto", "Formato \"U\"", "Formato Ilha"],
        fotos: [
          "assets/portfolio/boiserie-branco-1.jpg",
          "assets/portfolio/boiserie-branco-2.jpg",
          "assets/portfolio/boiserie-branco-3.jpg",
          "assets/portfolio/boiserie-branco-4.jpg",
          "assets/portfolio/boiserie-branco-5.jpg",
          "assets/portfolio/boiserie-branco-6.jpg",
        ],
      },
      {
        categoria: "Boiserie Azul",
        explicacao: "Estrutura com painéis em boiserie na cor azul — um toque de cor sofisticado para o bar.",
        layouts: ["Formato reto"],
        fotos: ["assets/portfolio/boiserie-azul-1.jpg"],
      },
      {
        categoria: "Treliça Espelhado",
        explicacao: "Estrutura em treliça de madeira com fundo espelhado — um efeito marcante de luz e reflexo.",
        layouts: ["Formato reto", "Formato \"U\"", "Formato Ilha"],
        fotos: [
          "assets/portfolio/trelica-espelhado-1.jpg",
          "assets/portfolio/trelica-espelhado-2.jpg",
        ],
      },
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
