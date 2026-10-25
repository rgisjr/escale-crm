"use client";
import { useT } from "@/hooks/i18n/useT";
import { textoDoEvento, type EventoDaConversa } from "@/lib/escale/conversas/eventos";

/** "{pessoa} colocou o atendimento em espera - 13:00" (c56; C2): centrado, 11px, os nomes em 600. */
export function EventoDaThread({
  evento,
  nomes,
}: {
  evento: EventoDaConversa;
  nomes: ReadonlyMap<string, string>;
}) {
  const t = useT();
  const { partes, hora } = textoDoEvento(evento, nomes, t);
  return (
    <div
      className="my-2 text-center text-[12px] text-casca-suave"
      data-testid={`item-evento-${evento.id}`}
    >
      {partes.map((p, i) => (
        <span key={i} className={p.forte ? "font-semibold text-casca-texto-2" : undefined}>
          {p.texto}
        </span>
      ))}
      <span>{` - ${hora}`}</span>
    </div>
  );
}
