"use client";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAtivosDeMidia } from "@/hooks/escale/useAtivosDeMidia";
import { useT } from "@/hooks/i18n/useT";
import type { ItemDaSequencia } from "@/lib/escale/automacoes/fluxo/sequencia";

type Midia = Extract<ItemDaSequencia, { tipo: "midia" }>;
type Pausa = Extract<ItemDaSequencia, { tipo: "pausa" }>;

const PREFIXO_DO_NUMERO = "var:";

/** Áudio, imagem, vídeo ou arquivo: da biblioteca da organização ou o "Áudio do número" (`var:<chave>`). */
export function ItemDeMidia({ item, aoMudar }: { item: Midia; aoMudar: (item: Midia) => void }) {
  const t = useT();
  const { data: ativos } = useAtivosDeMidia();
  const doNumero = item.asset.startsWith(PREFIXO_DO_NUMERO);
  const origem = doNumero ? "numero" : "biblioteca";
  return (
    <div className="flex flex-col gap-2">
      <SeletorDaCasca
        aria-label={t("Origem do arquivo")}
        aparencia="janela"
        valor={origem}
        aoMudar={(v) => aoMudar({ ...item, asset: v === "numero" ? PREFIXO_DO_NUMERO : "" })}
        opcoes={[
          { valor: "biblioteca", rotulo: t("Arquivo da biblioteca") },
          { valor: "numero", rotulo: t("Áudio do número") },
        ]}
      />
      {doNumero ? (
        <CampoDeTexto
          value={item.asset.slice(PREFIXO_DO_NUMERO.length)}
          aria-label={t("Chave do áudio")}
          placeholder="bv1"
          onChange={(e) => aoMudar({ ...item, asset: `${PREFIXO_DO_NUMERO}${e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")}` })}
          className="h-8"
        />
      ) : (
        <SeletorDaCasca
          aria-label={t("Arquivo")}
          aparencia="janela"
          valor={item.asset}
          vazio={t("Escolha o arquivo")}
          aoMudar={(v) => aoMudar({ ...item, asset: v })}
          opcoes={(ativos ?? []).map((a) => ({ valor: a.id, rotulo: a.nome }))}
        />
      )}
      <CampoDeTexto
        value={item.legenda}
        aria-label={t("Legenda")}
        placeholder={t("Legenda (opcional)")}
        onChange={(e) => aoMudar({ ...item, legenda: e.target.value })}
        className="h-8"
      />
    </div>
  );
}

/** A pausa curta entre duas mensagens (o "delay" da Clint): de 1 a 10 segundos. */
export function ItemDePausa({ item, aoMudar }: { item: Pausa; aoMudar: (item: Pausa) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-[13px] text-casca-texto">
      <span>{t("Aguardar")}</span>
      <CampoDeTexto
        inputMode="numeric"
        aria-label={t("Segundos de pausa")}
        value={String(item.segundos)}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, "").slice(0, 2));
          aoMudar({ ...item, segundos: Math.min(10, Math.max(1, n || 1)) });
        }}
        className="h-8 w-16 text-center"
      />
      <span>{t("segundos")}</span>
    </div>
  );
}
