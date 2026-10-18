"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  MAX_CONTEUDO_DA_ATIVIDADE,
  VAZIO_DO_CONTEUDO,
  type TipoDeAtividade,
} from "@/lib/escale/playbook/regras";
import { Pencil, Trash2 } from "@/lib/ui/icons-da-casca";

/** Quanto a gravação automática espera depois da última tecla (Clint: 750ms). */
const ESPERA_PARA_GRAVAR = 750;

/**
 * O DETALHE DA ATIVIDADE (fork Escale, Fase 1I; prints G01 e 017, P9).
 *
 * WhatsApp e Instagram mostram o balão da mensagem (com as variáveis já
 * trocadas); os outros tipos mostram o texto. O lápis liga o "Modo edição": a
 * caixa mostra o texto com as variáveis, e cada mudança grava sozinha 750ms
 * depois (como a Clint); sair do modo grava o que faltar. A lixeira só existe
 * para a atividade criada à mão. O `rodape` é o botão de executar do tipo
 * (Task 13).
 */
export function DetalheDaAtividade({
  tipo,
  titulo,
  conteudo,
  textoResolvido,
  editavel,
  aoSalvarConteudo,
  podeRemover,
  aoRemover,
  rodape,
}: {
  tipo: TipoDeAtividade;
  titulo: string;
  conteudo: string | null;
  textoResolvido: string;
  editavel: boolean;
  aoSalvarConteudo?: (texto: string) => void;
  podeRemover: boolean;
  aoRemover?: () => void;
  rodape?: ReactNode;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(conteudo ?? "");
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mensagem = tipo === "whatsapp" || tipo === "instagram";

  useEffect(
    () => () => {
      if (pendente.current) clearTimeout(pendente.current);
    },
    [],
  );

  const gravarJa = (valor: string) => {
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = null;
    if (valor !== (conteudo ?? "")) aoSalvarConteudo?.(valor);
  };
  const mudar = (valor: string) => {
    setTexto(valor);
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = setTimeout(() => gravarJa(valor), ESPERA_PARA_GRAVAR);
  };
  const alternarEdicao = () => {
    if (editando) gravarJa(texto);
    else setTexto(conteudo ?? "");
    setEditando((e) => !e);
  };

  return (
    <section aria-label={t("Detalhes da atividade")} className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
        <h3 className="flex min-w-0 items-center gap-2 text-[13px] text-casca-texto">
          <IconeDoTipo tipo={tipo} className="shrink-0 text-casca-marca" />
          <span className="truncate">{titulo}</span>
        </h3>
        <AjudaDaCasca texto={t("Ajuda com as atividades")} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {editando ? (
          <textarea
            aria-label={t("Conteúdo da atividade")}
            value={texto}
            maxLength={MAX_CONTEUDO_DA_ATIVIDADE}
            placeholder={t(VAZIO_DO_CONTEUDO[tipo])}
            onChange={(e) => mudar(e.target.value)}
            className="h-full min-h-[200px] w-full resize-none rounded-[6px] border border-casca-borda bg-surface p-3 text-[13.5px] leading-6 text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
          />
        ) : !textoResolvido.trim() ? (
          <div className="text-[13px]">
            {mensagem ? (
              <p className="font-semibold text-casca-texto">{t("Nenhuma mensagem adicionada")}</p>
            ) : null}
            <p className="text-casca-suave">{t(VAZIO_DO_CONTEUDO[tipo])}</p>
          </div>
        ) : mensagem ? (
          <p className="max-w-[520px] rounded-[10px] border border-casca-borda-msg bg-casca-caixa-msg px-3.5 py-2.5 text-[13.5px] whitespace-pre-line text-casca-texto">
            {textoResolvido}
          </p>
        ) : (
          <p className="text-[13px] whitespace-pre-line text-casca-texto-2">{textoResolvido}</p>
        )}
      </div>
      <footer className="flex h-[52px] shrink-0 items-center gap-3 border-t border-casca-borda px-4">
        {rodape}
        <BotaoDaCasca
          variante="icone"
          aria-label={editando ? t("Sair do modo edição") : t("Modo edição")}
          disabled={!editavel}
          title={
            editavel ? (editando ? t("Sair do modo edição") : t("Modo edição")) : t("Sem permissão")
          }
          onClick={alternarEdicao}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Pencil aria-hidden />
        </BotaoDaCasca>
        {podeRemover && aoRemover ? (
          <BotaoDaCasca
            variante="icone"
            aria-label={t("Remover atividade do negócio")}
            title={t("Remover atividade do negócio")}
            onClick={aoRemover}
          >
            <Trash2 aria-hidden />
          </BotaoDaCasca>
        ) : null}
      </footer>
    </section>
  );
}
