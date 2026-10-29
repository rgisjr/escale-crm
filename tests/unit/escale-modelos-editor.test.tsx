import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { FiltrosDoModeloNoEditor } from "@/components/escale/indicadores/editor/FiltrosDoModeloNoEditor";
import { perguntaDoRascunho, rascunhoDoGrafico } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import { adicionarIndicador, mesmoRascunho, rascunhoNovo, tirarDoFiltroFixo, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { CATALOGO_FALSO as CAT } from "@/tests/helpers/catalogo-da-tela";

const U = "22222222-2222-4222-8222-222222222222";
const TAGS = { combinar: "ou" as const, grupos: [{ modo: "ou" as const, condicoes: [{ op: "possui" as const, tag: "vip" }] }] };
const base = (): RascunhoDoGrafico => adicionarIndicador(rascunhoNovo("barra"), "negocio.quantidade", CAT);
const comFixo = (): RascunhoDoGrafico => ({ ...base(), filtroFixo: { usuarios: [U, U], tags: TAGS } });

describe("filtroFixo no rascunho", () => {
  it("ida e volta preserva o filtro fixo", () => {
    const r = comFixo();
    const res = perguntaDoRascunho(r, CAT);
    if (!res.ok) throw new Error("esperava ok");
    expect(res.pergunta.filtroFixo).toEqual(r.filtroFixo);
    expect(mesmoRascunho(rascunhoDoGrafico({ tipo: r.tipo, pergunta: res.pergunta, opcoes: r.opcoes }), r)).toBe(true);
  });
  it("filtro fixo vazio não vai para a pergunta", () => {
    const res = perguntaDoRascunho({ ...base(), filtroFixo: { usuarios: [] } }, CAT);
    if (!res.ok) throw new Error("esperava ok");
    expect(res.pergunta.filtroFixo).toBeUndefined();
  });
  it("tirarDoFiltroFixo tira só a chave e some quando esvazia", () => {
    const sem = tirarDoFiltroFixo(comFixo(), "usuarios");
    expect(sem.filtroFixo).toEqual({ tags: TAGS });
    expect(tirarDoFiltroFixo(sem, "tags").filtroFixo).toBeUndefined();
  });
});

describe("FiltrosDoModeloNoEditor", () => {
  function Caixa({ inicial }: { inicial: RascunhoDoGrafico }) {
    const [r, setR] = useState(inicial);
    return <FiltrosDoModeloNoEditor rascunho={r} mudar={(f) => setR(f)} />;
  }
  it("mostra os chips e o × tira só aquela chave", async () => {
    render(<Caixa inicial={comFixo()} />);
    expect(screen.getByText("Usuário (2)")).toBeTruthy();
    expect(screen.getByText("Tags (1)")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remover Usuário (2)" }));
    expect(screen.queryByText("Usuário (2)")).toBeNull();
    expect(screen.getByText("Tags (1)")).toBeTruthy();
  });
  it("some sem filtro fixo", () => {
    render(<Caixa inicial={base()} />);
    expect(screen.queryByText("Filtros do modelo")).toBeNull();
  });
});
