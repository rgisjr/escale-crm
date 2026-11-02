"use client";
import { CampoDeBuscaDaLista } from "@/components/escale/ui/CampoDeBuscaDaLista";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { FiltroDosComentarios as Filtro } from "@/lib/escale/comentarios/constantes";

const ATRASO_DA_BUSCA_MS = 250;

/** FORK ESCALE · Fase 10A (4.3): a busca por @ ou texto e o filtro dos comentários (D6). */
export function FiltroDosComentarios({
  busca,
  aoBuscar,
  filtro,
  aoMudarFiltro,
}: {
  busca: string;
  aoBuscar: (q: string) => void;
  filtro: Filtro;
  aoMudarFiltro: (f: Filtro) => void;
}) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-casca-borda px-6">
      <CampoDeBuscaDaLista
        valorDaUrl={busca}
        aoBuscar={(q) => aoBuscar(q ?? "")}
        rotulo={t("Buscar por @ ou texto")}
        atrasoMs={ATRASO_DA_BUSCA_MS}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-casca-gatilho bg-casca-raia px-2.5 text-[13px]"
      />
      <div className="w-44 shrink-0">
        <SeletorDaCasca<Filtro>
          aria-label={t("Filtrar comentários")}
          valor={filtro}
          aoMudar={(v) => v && aoMudarFiltro(v)}
          opcoes={[
            { valor: "todos", rotulo: t("Todos") },
            { valor: "sem_resposta", rotulo: t("Sem resposta") },
            { valor: "respondidos", rotulo: t("Respondidos") },
            { valor: "ocultos", rotulo: t("Ocultos") },
            { valor: "contatos", rotulo: t("Já é contato") },
          ]}
        />
      </div>
    </div>
  );
}
