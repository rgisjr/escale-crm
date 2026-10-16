"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  SEM_ATENDENTE,
  type CanalDaConversa,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";

import { RotuloDoGrupo, alternarNaLista } from "./controles";

/** Nomes de marca: iguais em todo idioma. */
const CANAIS: ReadonlyArray<{ valor: CanalDaConversa; nome: string }> = [
  { valor: "whatsapp", nome: "WhatsApp" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "facebook", nome: "Facebook" },
];

type Existe = "" | "com" | "sem";

/**
 * Conversas (Clint: "Conversas", dentro de "Mais filtros" na Casca V4): com ou
 * sem conversa, não lidas, não respondidas, status, canal e atendente. Olha a
 * conversa MAIS RECENTE do contato — a mesma que o card mostra.
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
        <SeletorDaCasca<Existe>
          aria-label={t("Conversa")}
          valor={c.existe ?? ""}
          opcoes={[
            { valor: "", rotulo: t("Com ou sem conversa") },
            { valor: "com", rotulo: t("Com conversa") },
            { valor: "sem", rotulo: t("Sem conversa") },
          ]}
          aoMudar={(v) => mudar({ existe: v === "com" || v === "sem" ? v : undefined })}
        />
      </div>

      {c.existe === "sem" ? null : (
        <>
          <div className="space-y-2">
            <CaixaDaCasca
              marcada={!!c.naoLidas}
              aoMudar={(m) => mudar({ naoLidas: m || undefined })}
              rotulo={t("Não lidas")}
            />
            <CaixaDaCasca
              marcada={!!c.semResposta}
              aoMudar={(m) => mudar({ semResposta: m || undefined })}
              rotulo={t("Não respondidas pelo atendente")}
            />
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Status da conversa")}</RotuloDoGrupo>
            <CaixaDaCasca
              marcada={!!c.situacao?.includes("aberta")}
              aoMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "aberta") })}
              rotulo={t("Aberta")}
            />
            <CaixaDaCasca
              marcada={!!c.situacao?.includes("encerrada")}
              aoMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "encerrada") })}
              rotulo={t("Encerrada")}
            />
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Canais")}</RotuloDoGrupo>
            {CANAIS.map((canal) => (
              <CaixaDaCasca
                key={canal.valor}
                marcada={!!c.canais?.includes(canal.valor)}
                aoMudar={() => mudar({ canais: alternarNaLista(c.canais, canal.valor) })}
                rotulo={canal.nome}
              />
            ))}
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Atendentes")}</RotuloDoGrupo>
            <CaixaDaCasca
              marcada={!!c.atendentes?.includes(SEM_ATENDENTE)}
              aoMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, SEM_ATENDENTE) })}
              rotulo={t("Não atribuídos")}
            />
            {(membros ?? []).map((m) => (
              <CaixaDaCasca
                key={m.user_id}
                marcada={!!c.atendentes?.includes(m.user_id)}
                aoMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, m.user_id) })}
                rotulo={m.full_name ?? t("Sem nome")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
