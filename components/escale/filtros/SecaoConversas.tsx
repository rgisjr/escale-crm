"use client";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  SEM_ATENDENTE,
  type CanalDaConversa,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";

import { Caixinha, RotuloDoGrupo, alternarNaLista, classeDoSeletor } from "./controles";

/** Nomes de marca: iguais em todo idioma. */
const CANAIS: ReadonlyArray<{ valor: CanalDaConversa; nome: string }> = [
  { valor: "whatsapp", nome: "WhatsApp" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "facebook", nome: "Facebook" },
];

/**
 * Conversas (Clint: "Conversas"), adaptado ao que o original tem: com ou sem
 * conversa, não lidas, não respondidas, status, canal e atendente. Olha a
 * conversa MAIS RECENTE do contato — a mesma que a capa do card mostra. O
 * original não tem setor; quando tiver, entra aqui.
 */
export function SecaoConversas({
  filtros,
  onMudar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
}) {
  const t = useT();
  const { data: membros } = useAssignableMembers(true);
  const c = filtros.conversa ?? {};
  const mudar = (parcial: Partial<FiltroDeConversa>) =>
    onMudar({ ...filtros, conversa: { ...c, ...parcial } });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Conversa")}</RotuloDoGrupo>
        <select
          aria-label={t("Conversa")}
          className={classeDoSeletor}
          value={c.existe ?? ""}
          onChange={(e) => {
            const existe = e.target.value;
            mudar({ existe: existe === "com" || existe === "sem" ? existe : undefined });
          }}
        >
          <option value="">{t("Com ou sem conversa")}</option>
          <option value="com">{t("Com conversa")}</option>
          <option value="sem">{t("Sem conversa")}</option>
        </select>
      </div>

      {c.existe === "sem" ? null : (
        <>
          <div className="space-y-2">
            <Caixinha marcada={!!c.naoLidas} onMudar={(m) => mudar({ naoLidas: m || undefined })}>
              {t("Não lidas")}
            </Caixinha>
            <Caixinha
              marcada={!!c.semResposta}
              onMudar={(m) => mudar({ semResposta: m || undefined })}
            >
              {t("Não respondidas pelo atendente")}
            </Caixinha>
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Status da conversa")}</RotuloDoGrupo>
            <Caixinha
              marcada={!!c.situacao?.includes("aberta")}
              onMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "aberta") })}
            >
              {t("Aberta")}
            </Caixinha>
            <Caixinha
              marcada={!!c.situacao?.includes("encerrada")}
              onMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "encerrada") })}
            >
              {t("Encerrada")}
            </Caixinha>
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Canais")}</RotuloDoGrupo>
            {CANAIS.map((canal) => (
              <Caixinha
                key={canal.valor}
                marcada={!!c.canais?.includes(canal.valor)}
                onMudar={() => mudar({ canais: alternarNaLista(c.canais, canal.valor) })}
              >
                {canal.nome}
              </Caixinha>
            ))}
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Atendentes")}</RotuloDoGrupo>
            <Caixinha
              marcada={!!c.atendentes?.includes(SEM_ATENDENTE)}
              onMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, SEM_ATENDENTE) })}
            >
              {t("Não atribuídos")}
            </Caixinha>
            {(membros ?? []).map((m) => (
              <Caixinha
                key={m.user_id}
                marcada={!!c.atendentes?.includes(m.user_id)}
                onMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, m.user_id) })}
              >
                {m.full_name ?? t("Sem nome")}
              </Caixinha>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
