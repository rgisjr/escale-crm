import { describe, expect, it } from "vitest";

import {
  caminhoDaOrganizacao,
  caminhoNoBucket,
  caminhoPertenceA,
  dataHoraBr,
  extensaoDe,
  familiaDaExtensao,
  filtrarArquivos,
  formatarTamanho,
  mimeDaExtensao,
  nomeSeguro,
  ordenarArquivos,
  validarArquivo,
  type Arquivo,
} from "@/lib/escale/negocio/arquivos";

/** FORK ESCALE · Fase 1H (C17, N8): as regras puras dos arquivos do contato. */
const arq = (nome: string, extra: Partial<Arquivo> = {}): Arquivo => ({
  id: nome,
  contact_id: "c1",
  lead_id: null,
  user_id: "u1",
  user_nome: "Ana",
  nome,
  extensao: extensaoDe(nome) ?? "",
  mime: "application/octet-stream",
  tamanho: 10,
  created_at: "2026-10-17T13:05:09Z",
  ...extra,
});

describe("extensão, tamanho e tipo", () => {
  it("extensaoDe lê a última extensão, minúscula; sem extensão é null", () => {
    expect(extensaoDe("Contrato.Final.PDF")).toBe("pdf");
    expect(extensaoDe("semext")).toBeNull();
  });
  it("validarArquivo aceita a lista da Clint até 25 MB", () => {
    expect(validarArquivo({ nome: "a.pdf", tamanho: 1 })).toEqual({ ok: true, extensao: "pdf" });
    expect(validarArquivo({ nome: "a.exe", tamanho: 1 })).toEqual({
      ok: false,
      erro: "Tipo de arquivo não suportado.",
    });
    expect(validarArquivo({ nome: "a.pdf", tamanho: 25 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      erro: "O arquivo {fileName} excede o limite de {maxMb} MB.",
    });
    expect(validarArquivo({ nome: "a.pdf", tamanho: 0 })).toEqual({
      ok: false,
      erro: "Arquivo vazio.",
    });
  });
  it("mime pela extensão e a família do ícone", () => {
    expect(mimeDaExtensao("png")).toBe("image/png");
    expect(mimeDaExtensao("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(familiaDaExtensao("jpg")).toBe("imagem");
    expect(familiaDaExtensao("csv")).toBe("planilha");
    expect(familiaDaExtensao("mp3")).toBe("audio");
    expect(familiaDaExtensao("zip")).toBe("pacote");
    expect(familiaDaExtensao("pdf")).toBe("documento");
  });
  it("tamanho e data no formato brasileiro", () => {
    expect(formatarTamanho(512)).toBe("512 B");
    expect(formatarTamanho(1536)).toBe("1,5 KB");
    expect(formatarTamanho(2 * 1024 * 1024)).toBe("2,0 MB");
    expect(dataHoraBr("2026-10-17T13:05:09Z", "UTC")).toBe("17/10/2026 13:05:09");
  });
});

describe("o nome do arquivo", () => {
  it("nomeSeguro tira caminho, aspas, controle e o truque de direção do texto", () => {
    expect(nomeSeguro("Proposta.pdf")).toBe("Proposta.pdf");
    expect(nomeSeguro("C:\\fakepath\\ficha final.pdf")).toBe("ficha final.pdf");
    expect(nomeSeguro("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(nomeSeguro('a"b\r\nSet-Cookie: x.pdf')).toBe("abSet-Cookie x.pdf");
    expect(nomeSeguro("fatura\u202Efdp.exe")).toBe("faturafdp.exe");
    expect(nomeSeguro("...oculto.pdf")).toBe("oculto.pdf");
  });
  it("nomeSeguro limita a 255 caracteres sem perder a extensão", () => {
    const nome = nomeSeguro(`${"a".repeat(400)}.pdf`);
    expect(nome).toHaveLength(255);
    expect(nome.endsWith(".pdf")).toBe(true);
  });
});

describe("o caminho no bucket", () => {
  it("é org/contato/id.ext e só pertence ao prefixo exato", () => {
    expect(caminhoNoBucket("o1", "c1", "a1", "pdf")).toBe("o1/c1/a1.pdf");
    expect(caminhoPertenceA("o1/c1/a1.pdf", "o1", "c1")).toBe(true);
    expect(caminhoPertenceA("o1/c2/a1.pdf", "o1", "c1")).toBe(false);
    expect(caminhoPertenceA("o1/c1/../x.pdf", "o1", "c1")).toBe(false);
  });
  it("caminhoDaOrganizacao aceita qualquer contato da organização (o do arquivo mesclado), nunca outra pasta", () => {
    expect(caminhoDaOrganizacao("o1/c-antigo/a1.pdf", "o1")).toBe(true);
    expect(caminhoDaOrganizacao("o2/c1/a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1x/c1/a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1/../o2/a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1/c1/./a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1//a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1/c1/a1.pdf/extra", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("o1\\c1\\a1.pdf", "o1")).toBe(false);
    expect(caminhoDaOrganizacao("/o1/c1/a1.pdf", "o1")).toBe(false);
  });
});

describe("filtro e ordenação", () => {
  const lista = [
    arq("contrato.pdf", { created_at: "2026-10-10T10:00:00Z" }),
    arq("foto.png", { created_at: "2026-10-17T10:00:00Z", tamanho: 5 }),
    arq("planilha.xlsx", { created_at: "2026-10-15T10:00:00Z", user_nome: "Bia" }),
  ];
  it("busca pelo nome, período pela data de upload, extensões em múltipla escolha", () => {
    expect(filtrarArquivos(lista, { busca: "FOTO", extensoes: [] }).map((a) => a.nome)).toEqual([
      "foto.png",
    ]);
    expect(
      filtrarArquivos(lista, { busca: "", de: "2026-10-15", ate: "2026-10-16", extensoes: [] }).map(
        (a) => a.nome,
      ),
    ).toEqual(["planilha.xlsx"]);
    expect(
      filtrarArquivos(lista, { busca: "", extensoes: ["pdf", "png"] }).map((a) => a.nome),
    ).toEqual(["contrato.pdf", "foto.png"]);
  });
  it("ordena por nome, data e usuário, nos dois sentidos; o padrão é data desc", () => {
    expect(ordenarArquivos(lista, "data", "desc").map((a) => a.nome)).toEqual([
      "foto.png",
      "planilha.xlsx",
      "contrato.pdf",
    ]);
    expect(ordenarArquivos(lista, "nome", "asc").map((a) => a.nome)).toEqual([
      "contrato.pdf",
      "foto.png",
      "planilha.xlsx",
    ]);
    expect(ordenarArquivos(lista, "usuario", "asc").map((a) => a.user_nome)).toEqual([
      "Ana",
      "Ana",
      "Bia",
    ]);
  });
});
