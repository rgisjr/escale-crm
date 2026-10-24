import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";

import type { DetalheDaProspeccao, EmpresaDaProspeccao, ProgressoDaEmpresa } from "./tipos";

/**
 * QUEM PODE SER MARCADO E EXCLUÍDO (fork Escale, Fase 8D; D10). Espelha as
 * regras do servidor do original (`select`, `selecionarNaFila`,
 * `DESCARTAR_DESMARCADAS_SQL` em `lib/prospecting/store.ts`): a tela só
 * oferece o que o servidor aceita.
 */
type Situacao = Pick<DetalheDaProspeccao, "status" | "statusDaBusca" | "config">;

/** Em rascunho (busca concluída) ou pausada: o envio não está no meio de uma abordagem. */
export function podeSelecionar(d: Situacao): boolean {
  return d.statusDaBusca === "succeeded" && (d.status === "draft" || d.status === "paused");
}

export const acaoDaSelecao = (d: Situacao): "select" | "select_in_queue" =>
  d.status === "draft" ? "select" : "select_in_queue";

export function marcavel(e: EmpresaDaProspeccao, d: Situacao): boolean {
  if (!podeSelecionar(d)) return false;
  if (d.status === "draft") return e.status === "new";
  if (e.status === "queued") return true;
  return (
    e.status === "skipped" &&
    !e.selecionada &&
    e.erro === RAZAO_NAO_SELECIONADA &&
    (d.config?.funnel_entry === "on_send" || !!e.conversaId)
  );
}

/** O que "Excluir desmarcadas" apaga: sem negócio nem conversa, e só o que o operador tirou. */
export function descartaveis(empresas: readonly EmpresaDaProspeccao[]): EmpresaDaProspeccao[] {
  return empresas.filter(
    (e) =>
      !e.selecionada &&
      !e.conversaId &&
      !e.negocioId &&
      (e.status === "new" || (e.status === "skipped" && e.erro === RAZAO_NAO_SELECIONADA)),
  );
}

/** As marcadas do rascunho (as que entram na fila ao iniciar). */
export const contarMarcadas = (empresas: readonly EmpresaDaProspeccao[]): number =>
  empresas.filter((e) => e.status === "new" && e.selecionada).length;

export interface FiltroDasEmpresas {
  busca: string;
  progressos: readonly ProgressoDaEmpresa[];
  /** Com a seleção ligada, as desmarcadas ficam escondidas até a pessoa pedir (o original). */
  mostrarDesmarcadas: boolean;
  podeSelecionar: boolean;
}

const soDigitos = (s: string) => s.replace(/\D/g, "");

export function filtrarEmpresas(
  empresas: readonly EmpresaDaProspeccao[],
  f: FiltroDasEmpresas,
): EmpresaDaProspeccao[] {
  const busca = f.busca.trim().toLocaleLowerCase("pt-BR");
  const digitos = soDigitos(busca);
  return empresas.filter((e) => {
    if (f.podeSelecionar && !f.mostrarDesmarcadas && !e.selecionada) return false;
    if (f.progressos.length && !f.progressos.includes(e.progresso)) return false;
    if (!busca) return true;
    if (e.dados.name.toLocaleLowerCase("pt-BR").includes(busca)) return true;
    return digitos.length > 0 && soDigitos(e.dados.phone ?? "").includes(digitos);
  });
}
