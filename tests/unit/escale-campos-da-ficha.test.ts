import { describe, expect, it } from "vitest";

import { camposDaEmpresaComGrupos, camposDoContatoComGrupos, gruposDaFicha } from "@/lib/escale/campos/da-ficha";

const t = (s: string) => s;
const CATALOGO = {
  grupos: [
    { id: "00000000-0000-4000-8000-0000000000a1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true },
    { id: "00000000-0000-4000-8000-0000000000a2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
  ],
  campos: [
    { id: "c1", objeto: "contato" as const, chave: "cargo", definicao: { label: "Cargo", type: "text" as const }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: false },
    { id: "c2", objeto: "contato" as const, chave: "score", definicao: { label: "Score", type: "number" as const }, grupo_id: "00000000-0000-4000-8000-0000000000a2", papel_minimo: null, posicao: 0, padrao: false },
  ],
};
const contato = {
  id: "x", name: "Ana", display_name: null, email: "ana@x.com", phone_number: "+5543998031566", birthdate: "1990-05-01",
  cpf_hash: "x", custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana", link_site: "https://ana.com" },
} as never;

describe("campos da ficha com grupos (1g-02, 1g-04)", () => {
  it("contato: fixos no grupo padrão, depois os do catálogo com o grupo de cada um; documento só leitura", () => {
    const campos = camposDoContatoComGrupos(contato, CATALOGO, t);
    expect(campos.map((c) => [c.chave, c.grupo])).toEqual([
      ["nome", "informacoes_gerais"], ["telefone", "informacoes_gerais"], ["email", "informacoes_gerais"],
      ["link_instagram", "informacoes_gerais"], ["documento", "informacoes_gerais"], ["nascimento", "informacoes_gerais"],
      ["cargo", "informacoes_gerais"], ["score", "kaio_ia"],
      ["link_site", "informacoes_gerais"], ["link_google_meu_negocio", "informacoes_gerais"], ["link_facebook", "informacoes_gerais"],
      ["link_linkedin", "informacoes_gerais"], ["link_tiktok", "informacoes_gerais"], ["link_youtube", "informacoes_gerais"], ["link_outro", "informacoes_gerais"],
    ]);
    const doc = campos.find((c) => c.chave === "documento")!;
    expect(doc.travado).toBe(true);
    expect(doc.valor).toBe("•••.•••.•••-••");
    expect(campos.find((c) => c.chave === "cargo")!.valor).toBe("CEO");
    expect(campos.find((c) => c.chave === "link_instagram")!.valor).toBe("https://instagram.com/ana");
  });

  it("empresa sem vínculo: os oito campos, travados e vazios", () => {
    const campos = camposDaEmpresaComGrupos(null, {
      grupos: CATALOGO.grupos.slice(0, 1),
      campos: [
        { id: "e1", objeto: "empresa", chave: "site", definicao: { label: "Site", type: "url" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: true },
        { id: "e2", objeto: "empresa", chave: "categoria", definicao: { label: "Categoria", type: "text" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 1, padrao: true },
        { id: "e3", objeto: "empresa", chave: "segmento", definicao: { label: "Segmento", type: "text" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 2, padrao: true },
        { id: "e4", objeto: "empresa", chave: "numero_de_funcionarios", definicao: { label: "Número de funcionários", type: "number" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 3, padrao: true },
      ],
    });
    expect(campos.map((c) => c.rotulo)).toEqual(["Nome da empresa", "Site", "Cidade", "Estado", "Categoria", "Segmento", "Número de funcionários", "CNPJ"]);
    expect(campos.every((c) => c.travado && c.valor === null)).toBe(true);
  });

  it("gruposDaFicha devolve chave e nome na ordem", () => {
    expect(gruposDaFicha(CATALOGO)).toEqual([{ chave: "informacoes_gerais", nome: "Informações Gerais" }, { chave: "kaio_ia", nome: "Kaio IA" }]);
  });
});
