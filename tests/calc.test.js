// Testes do núcleo de cálculo. Rodar com: node tests/calc.test.js
// Casos vindos da proposta real Catharina e Gabriel (seção 9 do briefing).
// Os dois valores marcados (*) estão errados no PDF do Canva — o teste exige o valor correto.

const calc = require("../js/calc.js");

let total = 0;
let falhas = 0;

function arredondar2(valor) {
  return Math.round(valor * 100) / 100;
}

function verificar(descricao, atual, esperado) {
  total++;
  const atualNormalizado = typeof atual === "number" ? arredondar2(atual) : atual;
  const esperadoNormalizado = typeof esperado === "number" ? arredondar2(esperado) : esperado;
  if (atualNormalizado === esperadoNormalizado) {
    console.log(`  OK  ${descricao}`);
  } else {
    falhas++;
    console.error(`  FALHOU  ${descricao} — esperado ${esperado}, obtido ${atual}`);
  }
}

function testarPacote(nomeCaso, { valorPorConvidado, convidados, opcoes }) {
  console.log(`\n${nomeCaso}`);
  const totalTabela = calc.calcularTotalTabela(valorPorConvidado, convidados);
  verificar(`${nomeCaso}: total de tabela`, totalTabela, opcoes.totalTabela);

  for (const opcao of opcoes.opcoesPagamento) {
    const totalComDesconto = calc.calcularTotalComDesconto(valorPorConvidado, convidados, opcao.percentualDesconto);
    verificar(`${nomeCaso}: total com desconto (${opcao.label})`, totalComDesconto, opcao.totalEsperado);

    if (opcao.metodo === "entrada_saldo") {
      const { entrada, saldo } = calc.calcularEntradaSaldo(totalComDesconto);
      verificar(`${nomeCaso}: entrada 30% (${opcao.label})`, entrada, opcao.entradaEsperada);
      verificar(`${nomeCaso}: saldo (${opcao.label})`, saldo, opcao.saldoEsperado);
    }

    if (opcao.metodo === "parcelas_fixas") {
      const { valorParcela } = calc.calcularParcelasFixas(totalComDesconto, opcao.numeroParcelas);
      verificar(`${nomeCaso}: parcela ${opcao.numeroParcelas}x (${opcao.label})`, valorParcela, opcao.parcelaEsperada);
    }
  }
}

// --- Signature, Nacionais, R$ 143 por convidado -------------------------------------------------
testarPacote("Signature / Nacionais / R$143 / 180 convidados", {
  valorPorConvidado: 143,
  convidados: 180,
  opcoes: {
    totalTabela: 25740,
    opcoesPagamento: [
      { label: "5%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.05, totalEsperado: 24453, entradaEsperada: 7336, saldoEsperado: 17117 },
      { label: "10%, boleto 9x", metodo: "parcelas_fixas", numeroParcelas: 9, percentualDesconto: 0.10, totalEsperado: 23166, parcelaEsperada: 2574 },
      { label: "15%, 2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.15, totalEsperado: 21879, parcelaEsperada: 10940 },
      { label: "20%, à vista", metodo: "avista", percentualDesconto: 0.20, totalEsperado: 20592 },
    ],
  },
});

// --- Signature, Importadas, R$ 179 por convidado (contém os 2 valores corrigidos do PDF) -------
testarPacote("Signature / Importadas / R$179 / 180 convidados", {
  valorPorConvidado: 179,
  convidados: 180,
  opcoes: {
    totalTabela: 32220,
    opcoesPagamento: [
      { label: "5%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.05, totalEsperado: 30609, entradaEsperada: 9183, saldoEsperado: 21426 },
      { label: "10%, boleto 9x (corrige PDF)", metodo: "parcelas_fixas", numeroParcelas: 9, percentualDesconto: 0.10, totalEsperado: 28998, parcelaEsperada: 3222 },
      { label: "15%, 2 parcelas (corrige PDF)", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.15, totalEsperado: 27387, parcelaEsperada: 13694 },
      { label: "20%, à vista", metodo: "avista", percentualDesconto: 0.20, totalEsperado: 25776 },
    ],
  },
});

// --- Elegance, Nacionais R$118 -------------------------------------------------
testarPacote("Elegance / Nacionais / R$118 / 180 convidados", {
  valorPorConvidado: 118,
  convidados: 180,
  opcoes: {
    totalTabela: 21240,
    opcoesPagamento: [
      { label: "0%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.00, totalEsperado: 21240, entradaEsperada: 6372, saldoEsperado: 14868 },
      { label: "5%, boleto 9x", metodo: "parcelas_fixas", numeroParcelas: 9, percentualDesconto: 0.05, totalEsperado: 20178, parcelaEsperada: 2242 },
      { label: "10%, 2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.10, totalEsperado: 19116, parcelaEsperada: 9558 },
      { label: "15%, à vista", metodo: "avista", percentualDesconto: 0.15, totalEsperado: 18054 },
    ],
  },
});

// --- Elegance, Importadas R$152 -------------------------------------------------
testarPacote("Elegance / Importadas / R$152 / 180 convidados", {
  valorPorConvidado: 152,
  convidados: 180,
  opcoes: {
    totalTabela: 27360,
    opcoesPagamento: [
      { label: "0%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.00, totalEsperado: 27360, entradaEsperada: 8208, saldoEsperado: 19152 },
      { label: "5%, boleto 9x", metodo: "parcelas_fixas", numeroParcelas: 9, percentualDesconto: 0.05, totalEsperado: 25992, parcelaEsperada: 2888 },
      { label: "10%, 2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.10, totalEsperado: 24624, parcelaEsperada: 12312 },
      { label: "15%, à vista", metodo: "avista", percentualDesconto: 0.15, totalEsperado: 23256 },
    ],
  },
});

// --- Select, Nacionais R$98 -------------------------------------------------
testarPacote("Select / Nacionais / R$98 / 180 convidados", {
  valorPorConvidado: 98,
  convidados: 180,
  opcoes: {
    totalTabela: 17640,
    opcoesPagamento: [
      { label: "0%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.00, totalEsperado: 17640, entradaEsperada: 5292, saldoEsperado: 12348 },
      { label: "5%, 2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.05, totalEsperado: 16758, parcelaEsperada: 8379 },
      { label: "10%, à vista", metodo: "avista", percentualDesconto: 0.10, totalEsperado: 15876 },
    ],
  },
});

// --- Select, Importadas R$126 -------------------------------------------------
testarPacote("Select / Importadas / R$126 / 180 convidados", {
  valorPorConvidado: 126,
  convidados: 180,
  opcoes: {
    totalTabela: 22680,
    opcoesPagamento: [
      { label: "0%, entrada+saldo", metodo: "entrada_saldo", percentualDesconto: 0.00, totalEsperado: 22680, entradaEsperada: 6804, saldoEsperado: 15876 },
      { label: "5%, 2 parcelas", metodo: "parcelas_fixas", numeroParcelas: 2, percentualDesconto: 0.05, totalEsperado: 21546, parcelaEsperada: 10773 },
      { label: "10%, à vista", metodo: "avista", percentualDesconto: 0.10, totalEsperado: 20412 },
    ],
  },
});

// --- Horas adicionais -------------------------------------------------
console.log("\nHoras adicionais (R$30 por convidado em 6h, 15% por hora extra)");
verificar("6h (sem alteração)", calc.calcularValorAjustadoPorHoras(30, 6), 30);
verificar("7h (+15%)", calc.calcularValorAjustadoPorHoras(30, 7), 34.5);
verificar("8h (+30%, soma simples)", calc.calcularValorAjustadoPorHoras(30, 8), 39);

// --- Número de parcelas no boleto -------------------------------------------------
console.log("\nNúmero de parcelas no boleto (quitado até 15 dias antes do evento, teto 10x)");
// Data de evento corrigida com a Julia: o exemplo original tinha 03/04/2027, mas o "prazo final:
// 20/02/2027" e o resultado "4x" só batem com evento = 07/03/2027.
verificar(
  "fechamento 13/11/2026, evento 07/03/2027 → 4x",
  calc.calcularNumeroParcelasBoleto("2026-11-13", "2027-03-07").quantidade,
  4
);
verificar(
  "fechamento 13/11/2026, evento 31/07/2027 → 9x",
  calc.calcularNumeroParcelasBoleto("2026-11-13", "2027-07-31").quantidade,
  9
);
{
  const resultado = calc.calcularNumeroParcelasBoleto("2026-11-13", "2027-10-10");
  verificar("fechamento 13/11/2026, evento 10/10/2027 → cálculo bruto 11x", resultado.quantidadeBruta, 11);
  verificar("fechamento 13/11/2026, evento 10/10/2027 → 10x (teto)", resultado.quantidade, 10);
}

// --- Resumo -------------------------------------------------
console.log(`\n${total - falhas}/${total} testes passaram.`);
if (falhas > 0) {
  process.exitCode = 1;
}
