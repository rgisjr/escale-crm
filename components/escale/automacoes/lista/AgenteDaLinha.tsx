import type { AgenteDaLista } from "@/lib/escale/automacoes/tipos";

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}

/** Avatar de iniciais do agente (24 px na linha, 22 px nos filtros). */
export function AvatarDoAgente({ nome, tamanho = 24 }: { nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: tamanho, height: tamanho }}
      className="grid shrink-0 place-items-center rounded-full bg-casca-marca-suave text-[10px] font-semibold text-casca-marca"
    >
      {iniciaisDoNome(nome)}
    </span>
  );
}

/** A coluna AGENTE: o primeiro agente e "+N"; sem agente, "—" (Q1). */
export function AgenteDaLinha({ ids, agentes }: { ids: readonly string[]; agentes: ReadonlyMap<string, AgenteDaLista> }) {
  const primeiro = ids.map((id) => agentes.get(id)).find((a): a is AgenteDaLista => a !== undefined);
  if (!primeiro) return <span className="text-[12px] text-casca-suave">—</span>;
  const outros = ids.length - 1;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AvatarDoAgente nome={primeiro.nome} />
      <span className="truncate text-[12px] text-casca-texto-2">{primeiro.nome}</span>
      {outros > 0 && <span className="text-[11px] text-casca-suave">+{outros}</span>}
    </span>
  );
}
