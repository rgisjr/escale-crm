"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { avisoDoFim, rodando, terminou } from "@/components/escale/contatos/massa/textosDasAcoes";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoEmMassa } from "@/lib/escale/massa/tipos";

import { useAcoesEmMassa } from "./useAcoesEmMassa";

const CHAVE = "escale:contatos:acoes";
const INTERVALO_RODANDO_MS = 3000;
const INTERVALO_ESPERANDO_MS = 30_000;
type Acompanhada = { id: string; acao: AcaoEmMassa };

function ler(): Acompanhada[] {
  try {
    const lido: unknown = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lido) ? (lido as Acompanhada[]) : [];
  } catch {
    return [];
  }
}
function gravar(lista: Acompanhada[]) {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // o navegador pode recusar; o aviso vale só enquanto a página estiver aberta
  }
}

/**
 * O AVISO DE FIM DAS AÇÕES EM MASSA (fork Escale, Fase 2B; Q6): acompanha as
 * ações pedidas nesta aba e, quando terminam, mostra o toast da Clint, refaz a
 * lista e, na exportação, oferece "Baixar exportação". "Aguardando aprovação" não
 * é fim (Q4): enquanto só há exportação esperando admin, pergunta a cada 30 s.
 */
export function useAcompanharAcoes() {
  const t = useT();
  const qc = useQueryClient();
  const [lista, setLista] = useState<Acompanhada[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
  useEffect(() => setLista(ler()), []);

  const [intervalo, setIntervalo] = useState(INTERVALO_RODANDO_MS);
  const consulta = useAcoesEmMassa(lista.length > 0, intervalo);

  useEffect(() => {
    const minhas = consulta.data?.minhas ?? [];
    const algumaRodando = lista.some((x) => {
      const a = minhas.find((m) => m.id === x.id);
      return !a || rodando(a.status);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o ritmo da pergunta segue a resposta
    setIntervalo(algumaRodando ? INTERVALO_RODANDO_MS : INTERVALO_ESPERANDO_MS);

    const terminadas = minhas.filter((a) => lista.some((x) => x.id === a.id) && terminou(a.status));
    if (terminadas.length === 0) return;
    for (const a of terminadas) {
      const { ok, texto } = avisoDoFim(t, a);
      if (!ok) {
        toast.error(texto);
        continue;
      }
      const baixar =
        a.acao === "exportar" && a.tem_arquivo
          ? {
              action: {
                label: t("Baixar exportação"),
                onClick: () =>
                  window.open(`/api/v1/acoes-em-massa/${a.id}/arquivo`, "_blank", "noopener"),
              },
              duration: 15_000,
            }
          : undefined;
      toast.success(texto, baixar);
      if (a.falhas > 0)
        toast.warning(t("{n} contatos não foram alterados.").replace("{n}", String(a.falhas)));
    }
    void qc.invalidateQueries({ queryKey: ["contacts"] });
    const resto = lista.filter((x) => !terminadas.some((a) => a.id === x.id));
    setLista(resto);
    gravar(resto);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a resposta nova dispara
  }, [consulta.data]);

  return {
    acompanhar: (id: string, acao: AcaoEmMassa) => {
      const nova = [...lista.filter((x) => x.id !== id), { id, acao }];
      setLista(nova);
      gravar(nova);
      setIntervalo(INTERVALO_RODANDO_MS);
    },
  };
}
