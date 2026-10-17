import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** FORK ESCALE · Fase 1G (N3): com a casca, o card abre a ficha; sem, o dossiê de sempre. */
const ler = (caminho: string) => readFileSync(join(__dirname, "..", "..", caminho), "utf8");

describe("o card abre a ficha (só na casca)", () => {
  it("KanbanBoard: a coluna da casca chama aoAbrirNegocio; a StageColumn continua com o dossiê", () => {
    const f = ler("components/kanban/KanbanBoard.tsx");
    expect(f).toContain("aoAbrirNegocio?: (leadId: string) => void;");
    expect(f).toContain("onOpen={aoAbrirNegocio ?? setDossieId}");
    expect(f.match(/onOpen=\{setDossieId\}/g)).toHaveLength(1);
  });

  it("_client: só a casca passa aoAbrirNegocio, com a busca da URL", () => {
    expect(ler("app/app/pipelines/[id]/_client.tsx")).toContain(
      "aoAbrirNegocio={cascaNova ? (id) => router.push(rotaDoNegocio(id, searchParams.toString())) : undefined}",
    );
  });

  it("Visualização: o card abre a ficha", () => {
    expect(ler("components/escale/visualizacoes/QuadroCombinado.tsx")).toContain(
      "onOpen={aoAbrirNegocio ?? setDossieId}",
    );
    expect(ler("components/escale/visualizacoes/QuadroDaVisualizacao.tsx")).toContain(
      "aoAbrirNegocio={(id) => router.push(rotaDoNegocio(id, searchParams.toString()))}",
    );
  });
});
