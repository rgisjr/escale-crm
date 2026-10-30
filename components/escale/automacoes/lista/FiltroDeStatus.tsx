"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { StatusDoFiltro } from "@/lib/escale/automacoes/tipos";

const OPCOES: readonly { valor: StatusDoFiltro; rotulo: string }[] = [
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "pausada", rotulo: "Pausada" },
];

/** O filtro Status (07-002): Ativa e Pausada, sem fechar ao marcar. */
export function FiltroDeStatus({
  valor,
  aoMudar,
}: {
  valor: readonly StatusDoFiltro[];
  aoMudar: (v: readonly StatusDoFiltro[]) => void;
}) {
  const t = useT();
  function alternar(v: StatusDoFiltro, marcar: boolean) {
    aoMudar(marcar ? [...valor, v] : valor.filter((x) => x !== v));
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <GatilhoDeFiltro rotulo={t("Status")} contagem={valor.length} />
      </PopoverTrigger>
      <PainelSuspenso className="w-[200px] p-2">
        {OPCOES.map((o) => (
          <div key={o.valor} className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[12px] hover:bg-casca-raia">
            <CaixaDaCasca marcada={valor.includes(o.valor)} aoMudar={(m) => alternar(o.valor, m)} rotulo={t(o.rotulo)} />
          </div>
        ))}
      </PainelSuspenso>
    </Popover>
  );
}
