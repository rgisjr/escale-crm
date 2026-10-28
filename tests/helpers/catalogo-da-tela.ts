import type { CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";

/** Um catálogo pequeno (negócio e conversa) no formato do GET /catalogo, para os testes do editor (7D). */
export const CATALOGO_FALSO: CatalogoDaTela = {
  assuntos: [
    {
      id: "negocio",
      nome: "Negócio",
      categoria: "negocios",
      umaLinhaPor: "Uma linha por negócio.",
      perguntas: ["Quantos negócios eu tenho?"],
      medidas: [
        {
          id: "negocio.quantidade",
          nome: "Quantidade",
          unidade: "contagem",
          descricao: "Total de negócios.",
          apelidos: ["vendas", "quantidade de negócios"],
          perguntas: ["Quantos negócios eu ganhei?"],
          antesDeUsar: "Conta negócios criados no período.",
        },
        { id: "negocio.soma_de_valores", nome: "Soma de valores", unidade: "valor", descricao: "Soma.", apelidos: [], perguntas: [], antesDeUsar: null },
        { id: "negocio.ganhos", nome: "Ganhos", unidade: "contagem", descricao: "Ganhos.", apelidos: [], perguntas: ["Quantos ganhei?"], antesDeUsar: null },
      ],
      variaveis: [
        { id: "negocio.etapa", nome: "Etapa", tipo: "texto", opcoes: "etapas", descricao: null, ordemNatural: true },
        { id: "negocio.origem", nome: "Origem", tipo: "texto", opcoes: "origens", descricao: null, ordemNatural: false },
        { id: "negocio.titulo", nome: "Título", tipo: "texto", opcoes: null, descricao: null, ordemNatural: false },
        { id: "negocio.valor", nome: "Valor", tipo: "numero", opcoes: null, descricao: null, ordemNatural: false },
      ],
      tempos: [{ id: "negocio.criado_em", nome: "Data de criação", padrao: true, descricao: null }],
      camposPersonalizados: ["negocio", "contato"],
      colunasDoDetalhamento: [
        { chave: "titulo", nome: "Título" },
        { chave: "etapa", nome: "Etapa" },
      ],
    },
    {
      id: "conversa",
      nome: "Conversa",
      categoria: "conversas",
      umaLinhaPor: "Uma linha por conversa.",
      perguntas: [],
      medidas: [{ id: "conversa.iniciadas", nome: "Conversas iniciadas", unidade: "contagem", apelidos: [], perguntas: [], antesDeUsar: null }],
      variaveis: [{ id: "conversa.canal", nome: "Canal", tipo: "texto", opcoes: "canais", descricao: null, ordemNatural: false }],
      tempos: [{ id: "conversa.criada_em", nome: "Data de criação", padrao: true, descricao: null }],
      camposPersonalizados: [],
      colunasDoDetalhamento: [],
    },
  ],
  camposPersonalizados: {
    negocio: [],
    contato: [{ id: "campo:contato:cargo", nome: "Cargo", objeto: "contato", chave: "cargo", tipo: "texto" }],
    empresa: [],
  },
};
