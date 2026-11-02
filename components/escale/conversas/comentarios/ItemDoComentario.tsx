"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { ComentarioDaCaixa } from "@/lib/escale/comentarios/caixa";
import type { ContaParaACaixa } from "@/hooks/escale/useComentarios";
import { horaDaLinha } from "@/lib/escale/conversas/linha";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { EyeOff, UserRound } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AcoesDoComentario } from "./AcoesDoComentario";

export interface ItemDoComentarioProps {
  comentario: ComentarioDaCaixa;
  conta: ContaParaACaixa;
  escolhido: boolean;
  nivel: 0 | 1;
  aoEscolher: (c: ComentarioDaCaixa) => void;
  /** Põe o compositor em "Responder em público" mirando `c`. */
  aoResponder: (c: ComentarioDaCaixa) => void;
  /** Põe o compositor em "Mandar direct" mirando `c`. */
  aoMandarDirect: (c: ComentarioDaCaixa) => void;
  aoOcultar: (c: ComentarioDaCaixa, ocultar: boolean) => void;
  /** Abre a confirmação. */
  aoApagar: (c: ComentarioDaCaixa) => void;
  /** O escolhido (o item mostra o anel em volta dele e das ações fixas). */
  escolhidoId?: string | null;
  agora?: Date;
}

function Avatar({ comentario }: { comentario: ComentarioDaCaixa }) {
  const [falhou, setFalhou] = useState(false);
  const { autor } = comentario;
  const nome = autor.nome ?? autor.usuario ?? "";
  if (autor.foto && !falhou) {
    return <img src={autor.foto} alt="" className="size-8 shrink-0 rounded-full object-cover" onError={() => setFalhou(true)} />;
  }
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-medium text-white"
      style={{ backgroundColor: corDoAvatar(autor.id) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}

/** O item de comentário (com as respostas aninhadas): FORK ESCALE · Fase 10A (4.4). A 10D põe o "Curtir" nas ações. */
export function ItemDoComentario(props: ItemDoComentarioProps) {
  const { comentario, conta, escolhido, nivel, aoEscolher, aoResponder, aoMandarDirect, aoOcultar, aoApagar } = props;
  const t = useT();
  const agora = props.agora ?? new Date();
  const { autor } = comentario;
  const semResposta = nivel === 0 && !autor.daPropriaConta && !comentario.respondido;
  const nome = autor.usuario ? `@${autor.usuario}` : (autor.nome ?? t("Sem nome"));
  return (
    <div className={cn(nivel === 1 && "ml-11 border-l border-casca-borda pl-3")}>
      <article
        className={cn("group flex gap-3 rounded-lg p-2", escolhido && "ring-1 ring-casca-marca")}
        aria-label={`${t("Comentário")} ${nome}`}
      >
        <Avatar comentario={comentario} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => aoEscolher(comentario)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                aoEscolher(comentario);
              }
            }}
            className="flex min-w-0 cursor-pointer flex-col gap-1 focus-visible:outline-none"
          >
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[14px] font-semibold text-casca-texto">{nome}</span>
              {autor.usuario && autor.nome ? <span className="text-[13px] text-casca-meta">{autor.nome}</span> : null}
              {autor.daPropriaConta ? (
                <span className="rounded bg-casca-marca-suave px-1.5 text-[11px] text-casca-marca">{t("Você")}</span>
              ) : null}
              {comentario.contato ? (
                <span className="inline-flex items-center gap-1 rounded bg-casca-raia px-1.5 text-[11px] text-casca-texto">
                  <UserRound size={12} aria-hidden />
                  {t("Contato")}
                </span>
              ) : null}
              {comentario.oculto ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-casca-aviso">
                  <EyeOff size={12} aria-hidden />
                  {t("Oculto")}
                </span>
              ) : null}
              {semResposta ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-casca-texto">
                  <span aria-hidden className="size-1.5 rounded-full bg-casca-marca" />
                  {t("Sem resposta")}
                </span>
              ) : null}
            </span>
            <p className={cn("text-[14px] break-words whitespace-pre-wrap text-casca-texto", comentario.oculto && "opacity-60")}>
              {comentario.texto}
            </p>
            <span className="text-[12px] text-casca-meta">
              {horaDaLinha(comentario.comentadoEm, agora, t)}
              {comentario.curtidas ? ` · ${t("{n} curtidas").replace("{n}", comentario.curtidas.toLocaleString("pt-BR"))}` : ""}
            </span>
          </div>
          <div className={cn("-ml-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100", escolhido && "opacity-100")}>
            <AcoesDoComentario
              comentario={comentario}
              conta={conta}
              aoResponder={() => aoResponder(comentario)}
              aoMandarDirect={() => aoMandarDirect(comentario)}
              aoOcultar={(o) => aoOcultar(comentario, o)}
              aoApagar={() => aoApagar(comentario)}
            />
          </div>
        </div>
      </article>
      {comentario.respostas.map((r) => (
        <ItemDoComentario key={r.id} {...props} comentario={r} nivel={1} escolhido={r.id === props.escolhidoId} />
      ))}
    </div>
  );
}
