"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { Ellipsis } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const CABECA =
  "h-10 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-casca-sobrelinha";
const CELULA = "h-14 px-3 text-[12px] text-casca-texto";

function MenuDaLinha({ item, aoRemover }: { item: AgendadaLida; aoRemover: (id: string) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t("Opções do agendamento")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <Ellipsis size={16} aria-hidden />
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[200px] py-1">
        <button
          type="button"
          className="flex h-9 w-full items-center px-3 text-left text-[12px] text-casca-alerta hover:bg-casca-raia"
          onClick={() => {
            setAberto(false);
            aoRemover(item.id);
          }}
        >
          {t("Remover agendamento")}
        </button>
      </PainelSuspenso>
    </Popover.Root>
  );
}

/** A tabela da Clint (c39, c61, c62): Contato · Criação · Envio · Dispositivo · Mensagem · ⋮. */
export function TabelaDeAgendadas({
  itens,
  aoRemover,
  compacta = false,
}: {
  itens: AgendadaLida[];
  aoRemover: (id: string) => void;
  compacta?: boolean;
}) {
  const t = useT();
  return (
    <table className="w-full border-collapse" data-testid="tabela-de-agendadas">
      <thead>
        <tr className="border-b border-casca-borda">
          {!compacta ? <th className={CABECA}>{t("Contato")}</th> : null}
          <th className={CABECA}>{t("Criação")}</th>
          <th className={CABECA}>{t("Envio")}</th>
          <th className={CABECA}>{t("Dispositivo")}</th>
          <th className={CABECA}>{t("Mensagem")}</th>
          <th className={cn(CABECA, "w-10")} />
        </tr>
      </thead>
      <tbody>
        {itens.map((a) => (
          <tr key={a.id} className="border-b border-casca-borda hover:bg-casca-raia/50">
            {!compacta ? (
              <td className={CELULA}>
                <span className="flex items-center gap-2">
                  <FotoDaLinha
                    id={a.contact_id}
                    nome={a.contato.nome}
                    temFoto={a.contato.tem_foto}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.contato.nome}</span>
                    <span className="block text-[11px] text-casca-suave">
                      {a.contato.telefone ?? ""}
                    </span>
                  </span>
                </span>
              </td>
            ) : null}
            <td className={cn(CELULA, "whitespace-nowrap tabular-nums")}>
              {dataHoraBr(a.created_at)}
            </td>
            <td className={cn(CELULA, "whitespace-nowrap tabular-nums")}>
              {dataHoraBr(a.enviar_em)}
            </td>
            <td className={CELULA}>{a.dispositivo.nome}</td>
            <td className={cn(CELULA, "max-w-[320px]")}>
              <span
                className="block truncate"
                title={a.tipo === "texto" ? (a.corpo ?? "") : a.template?.name}
              >
                {a.tipo === "texto" ? a.corpo : `${t("Modelo")}: ${a.template?.name ?? ""}`}
              </span>
              {a.status === "falhou" && a.erro ? (
                <span className="block text-[11px] text-casca-alerta">{a.erro}</span>
              ) : null}
            </td>
            <td className={cn(CELULA, "text-right")}>
              {a.status === "pendente" ? <MenuDaLinha item={a} aoRemover={aoRemover} /> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
