"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  MAX_GRUPOS_EM_MASSA,
  PRIORIDADES,
  ROTULO_DA_PRIORIDADE,
  principalPorPrioridade,
  type Prioridade,
  type Sugestao,
} from "@/lib/escale/mescla/regras";
import { X } from "@/lib/ui/icons-da-casca";

const PREVIA = 20;

/** "Mesclando em massa" (Clint): o critério, os vencedores previstos e o botão. Sem escolha por campo. */
export function MesclaEmMassa({
  selecionadas,
  prioridade,
  aoMudarPrioridade,
  aoRemover,
  aoMesclar,
}: {
  selecionadas: Sugestao[];
  prioridade: Prioridade;
  aoMudarPrioridade: (p: Prioridade) => void;
  aoRemover: (chave: string) => void;
  aoMesclar: () => void;
}) {
  const t = useT();
  const n = selecionadas.length;
  const acima = n > MAX_GRUPOS_EM_MASSA;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-casca-borda px-5 py-3 text-[15px] font-medium text-casca-texto">{t("Mesclando em massa")}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] font-medium text-casca-texto">{t("Critério de priorização")}</p>
        <div className="mt-2 w-[260px]">
          <SeletorDaCasca
            valor={prioridade}
            opcoes={PRIORIDADES.map((p) => ({ valor: p, rotulo: t(ROTULO_DA_PRIORIDADE[p]) }))}
            aoMudar={(v) => aoMudarPrioridade((v || "criado_por_ultimo") as Prioridade)}
            aria-label={t("Critério de priorização")}
            aparencia="janela"
          />
        </div>
        <p className="mt-5 text-[13px] font-medium text-casca-texto">{t("Vencedores previstos")}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {selecionadas.slice(0, PREVIA).map((s) => {
            const vencedor = s.contatos.find((c) => c.id === principalPorPrioridade(s.contatos, prioridade));
            return (
              <li key={s.chave} className="flex items-center justify-between rounded-md border border-casca-borda px-3 py-2 text-[13px]">
                <span className="truncate">{vencedor?.nome ?? vencedor?.telefone ?? "—"}</span>
                <button type="button" aria-label={t("Remover da seleção")} title={t("Remover da seleção")} onClick={() => aoRemover(s.chave)} className="grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
                  <X size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        {n > PREVIA ? (
          <p className="mt-2 text-[12px] text-casca-suave">{`+${n - PREVIA} ${t("grupos selecionados serão mesclados com o mesmo critério")}`}</p>
        ) : null}
        {acima ? (
          <div className="mt-4 rounded-md border border-warning bg-warning-bg p-3 text-[13px]">
            <p className="font-medium">{t("Seleção acima do limite")}</p>
            <p className="mt-1 text-casca-suave">
              {t("Refine o filtro: a seleção ({count}) passa do limite de {cap} por mescla.").replace("{count}", String(n)).replace("{cap}", String(MAX_GRUPOS_EM_MASSA))}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-casca-borda px-5 py-3">
        <BotaoDaCasca variante="marca" tamanho="md" disabled={acima || n === 0} onClick={aoMesclar}>
          {n === 1 ? t("Mesclar 1 grupo selecionado") : `${t("Mesclar")} ${n} ${t("grupos selecionados")}`}
        </BotaoDaCasca>
      </div>
    </div>
  );
}
