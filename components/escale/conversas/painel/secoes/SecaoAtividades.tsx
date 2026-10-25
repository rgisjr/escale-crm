"use client";
import Link from "next/link";
import { toast } from "sonner";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { gruposDaLista, type AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { haQuantoTempo, horaDaTarefa, rotaDoNegocio } from "@/lib/escale/negocio/regras";
import {
  Calendar,
  ClipboardList,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

const ICONE_DO_TIPO: Record<string, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  agendamento: Calendar,
  reuniao: Calendar,
  whatsapp: MessageCircle,
  instagram: MessageCircle,
  tarefa: ClipboardList,
};

/** A seção Atividades (c16, 02-004): por dia, a caixinha conclui no card (D6), o link leva à ficha. */
export function SecaoAtividades({
  quadro,
  aoVoltar,
}: {
  quadro: QuadroDoNegocio;
  aoVoltar: () => void;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const ativ = useAtividadesDoNegocio(quadro.lead);
  const agora = new Date();
  const pendentes = (ativ.dados?.atividades ?? []).filter((a) => a.status !== "done");
  const grupos = gruposDaLista(pendentes, agora, idioma, t);
  const atrasadas = pendentes.filter(
    (a) => a.due_date && Date.parse(a.due_date) < agora.getTime(),
  ).length;
  const href = rotaDoNegocio(quadro.lead.id, "", { aba: "atividades" });

  const concluir = async (a: AtividadeDoNegocio) => {
    try {
      const r = await ativ.alternar(a);
      toast.success(
        r === "concluida"
          ? t("Tarefa concluída com sucesso")
          : t("Marcação de tarefa removida com sucesso"),
      );
    } catch {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    }
  };

  return (
    <SecaoAberta
      titulo={t("Atividades")}
      icone={ICONE_DA_SECAO.atividades}
      aoVoltar={aoVoltar}
      direita={
        <>
          {atrasadas > 0 ? (
            <span className="rounded-full bg-casca-atraso px-2 text-[12px] font-medium text-casca-alerta">{`${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}`}</span>
          ) : null}
          <Link
            href={href}
            aria-label={t("Abrir negócio")}
            title={t("Abrir negócio")}
            className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <ExternalLink size={14} aria-hidden />
          </Link>
        </>
      }
    >
      {ativ.carregando ? (
        <p className="text-[14px] text-casca-suave">{t("Carregando…")}</p>
      ) : ativ.falhou ? (
        <p className="text-[14px] text-casca-suave">
          {t("Não foi possível carregar as atividades")}
        </p>
      ) : grupos.length === 0 ? (
        <VazioDaCasca
          className="pt-4"
          icone={ClipboardList}
          titulo={t("Nenhuma atividade para este negócio")}
          acao={
            <Link href={href} className="text-[14px] text-casca-marca hover:underline">
              {t("Criar atividade")}
            </Link>
          }
        />
      ) : (
        grupos.map((g) => (
          <div key={g.chave} className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-casca-texto">
              {g.rotulo ?? t("Sem prazo")}
              <span className="rounded-full bg-casca-raia px-2 text-[12px] font-normal text-casca-suave">{`${g.itens.length} ${g.itens.length === 1 ? t("atividade") : t("atividades")}`}</span>
            </p>
            {g.itens.map((a) => {
              const Icone = ICONE_DO_TIPO[a.tipo] ?? ClipboardList;
              return (
                <div
                  key={a.id}
                  className="flex h-12 items-center gap-3 rounded-[8px] border border-casca-borda px-3"
                >
                  <Icone size={16} aria-hidden className="shrink-0 text-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-medium text-casca-texto">
                      {a.title}
                    </span>
                    {a.due_date ? (
                      <span className="text-[12px] text-casca-suave">{`${horaDaTarefa(a.due_date, idioma)} · ${haQuantoTempo(a.due_date, agora, idioma)}`}</span>
                    ) : null}
                  </span>
                  <CaixaDaCasca
                    marcada={false}
                    aoMudar={() => void concluir(a)}
                    rotulo={`${t("Concluir")}: ${a.title}`}
                  />
                </div>
              );
            })}
          </div>
        ))
      )}
      <Link
        href={href}
        className="flex items-center justify-center gap-1 pt-2 text-[12px] text-casca-marca hover:underline"
      >
        {t("Criar, editar ou reagendar no negócio")}
        <ExternalLink size={12} aria-hidden />
      </Link>
    </SecaoAberta>
  );
}
