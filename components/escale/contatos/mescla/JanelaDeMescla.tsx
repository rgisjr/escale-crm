"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useRef, useState } from "react";

import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import {
  useMesclar,
  useMesclarEmMassa,
  useSugestoesDeMescla,
  type FiltroDasSugestoes,
} from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import type { ResultadoDaMescla } from "@/lib/escale/mescla/banco";
import type { Prioridade } from "@/lib/escale/mescla/regras";
import { X } from "@/lib/ui/icons-da-casca";

import { ComparacaoDaMescla, type PedidoDaComparacao } from "./ComparacaoDaMescla";
import { ConfirmarMescla, FalhaDaMescla, MesclaConcluida, Mesclando } from "./EtapasDaMescla";
import { ListaDeSugestoes } from "./ListaDeSugestoes";
import { MesclaEmMassa } from "./MesclaEmMassa";

const FILTRO_INICIAL: FiltroDasSugestoes = { q: "", ordem: "maior_confianca", regras: [], min: 0, max: 100, tags: [], validos: false };

type Etapa =
  | { tipo: "lista" }
  | { tipo: "confirmar"; unica: PedidoDaComparacao | null }
  | { tipo: "mesclando" }
  | { tipo: "concluida"; contatos: number; falhas: string[]; vencedor: string | null }
  | { tipo: "erro"; mensagem: string; repetir: () => void };

/**
 * A JANELA "MESCLAR CONTATOS DUPLICADOS" (fork Escale, Fase 2E; C2; Clint
 * `DuplicateContactsV2`). Lista de sugestões à esquerda; à direita a comparação
 * da escolhida ou, com duas ou mais marcadas, a mescla em massa; depois
 * confirmar, mesclando e concluído. Aberta pelo contato, já vem na sugestão dele.
 */
export function JanelaDeMescla({
  aberta,
  contatoInicial,
  aoFechar,
  aoMesclar,
  aoVerContato,
}: {
  aberta: boolean;
  contatoInicial?: string;
  aoFechar: () => void;
  aoMesclar: (r: ResultadoDaMescla) => void;
  aoVerContato: (id: string) => void;
}) {
  const t = useT();
  const [filtro, setFiltro] = useState<FiltroDasSugestoes>(FILTRO_INICIAL);
  const consulta = useMemo(() => ({ ...filtro, contato: contatoInicial }), [filtro, contatoInicial]);
  const lista = useSugestoesDeMescla(consulta, aberta);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [prioridade, setPrioridade] = useState<Prioridade>("criado_por_ultimo");
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "lista" });
  const mesclar = useMesclar();
  const emMassa = useMesclarEmMassa();

  // Aberta pelo contato, a sugestão dele (a primeira) já vem escolhida, sem efeito.
  const chaveEscolhida = escolhida ?? (contatoInicial ? (lista.sugestoes[0]?.chave ?? null) : null);
  const sugestao = lista.sugestoes.find((s) => s.chave === chaveEscolhida) ?? null;
  const selecionadas = lista.sugestoes.filter((s) => marcadas.has(s.chave));
  const marcar = (chaves: string[], marcar: boolean) =>
    setMarcadas((atual) => {
      const novo = new Set(atual);
      for (const c of chaves) {
        if (marcar) novo.add(c);
        else novo.delete(c);
      }
      return novo;
    });

  // Fechar a janela no meio de "Mesclando" não pode deixar a resposta atrasada gravar a etapa
  // ("concluída"/"erro") para a próxima vez que ela abrir.
  const geracao = useRef(0);
  const rodarUnica = (p: PedidoDaComparacao) => {
    setEtapa({ tipo: "mesclando" });
    const minha = geracao.current;
    mesclar.mutate(
      { principal_id: p.principal.id, secundarios: p.secundarios, escolhas: p.escolhas },
      {
        onSuccess: (r) => {
          aoMesclar(r);
          if (minha !== geracao.current) return;
          setEscolhida(null);
          setEtapa({ tipo: "concluida", contatos: r.contatos_mesclados.length + 1, falhas: [], vencedor: r.contato_id });
        },
        onError: (e) => {
          if (minha !== geracao.current) return;
          setEtapa({ tipo: "erro", mensagem: e.message, repetir: () => rodarUnica(p) });
        },
      },
    );
  };
  const rodarEmMassa = () => {
    const grupos = selecionadas.map((s) => s.contatos.map((c) => c.id));
    setEtapa({ tipo: "mesclando" });
    const minha = geracao.current;
    emMassa.mutate(
      { grupos, prioridade },
      {
        onSuccess: (r) => {
          r.mesclados.forEach(aoMesclar);
          if (minha !== geracao.current) return;
          setMarcadas(new Set());
          setEtapa({
            tipo: "concluida",
            contatos: r.mesclados.reduce((n, m) => n + m.contatos_mesclados.length, 0),
            falhas: r.falhas.map((f) => f.erro),
            vencedor: null,
          });
        },
        onError: (e) => {
          if (minha !== geracao.current) return;
          setEtapa({ tipo: "erro", mensagem: e.message, repetir: rodarEmMassa });
        },
      },
    );
  };

  const fechar = () => {
    geracao.current += 1;
    setEtapa({ tipo: "lista" });
    setEscolhida(null);
    setMarcadas(new Set());
    aoFechar();
  };

  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !a && fechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[46px] left-1/2 z-50 flex h-[calc(100dvh-46px)] w-[calc(100vw-96px)] max-w-[1428px] -translate-x-1/2 flex-col rounded-t-[8px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <DialogPrimitive.Title className="text-[15px] font-medium">{t("Mesclar contatos duplicados")}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="mr-1 grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {etapa.tipo === "lista" ? (
            <div className="flex min-h-0 flex-1">
              <ListaDeSugestoes
                filtro={filtro}
                aoMudarFiltro={setFiltro}
                sugestoes={lista.sugestoes}
                total={lista.total}
                carregando={lista.isLoading}
                erro={lista.isError}
                temMais={lista.temMais}
                aoCarregarMais={lista.carregarMais}
                escolhida={chaveEscolhida}
                aoEscolher={setEscolhida}
                marcadas={marcadas}
                aoMarcar={marcar}
              />
              {selecionadas.length >= 2 ? (
                <MesclaEmMassa
                  selecionadas={selecionadas}
                  prioridade={prioridade}
                  aoMudarPrioridade={setPrioridade}
                  aoRemover={(c) => marcar([c], false)}
                  aoMesclar={() => setEtapa({ tipo: "confirmar", unica: null })}
                />
              ) : sugestao ? (
                <ComparacaoDaMescla key={sugestao.chave} sugestao={sugestao} aoMesclar={(p) => setEtapa({ tipo: "confirmar", unica: p })} />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-[17px] font-semibold text-casca-texto">{t("Selecione uma sugestão para mesclar")}</p>
                  <p className="max-w-[300px] text-[15px] text-casca-suave">
                    {t("Escolha uma sugestão na lista ao lado para revisar e confirmar a mescla.")}
                  </p>
                </div>
              )}
            </div>
          ) : etapa.tipo === "confirmar" ? (
            <ConfirmarMescla
              grupos={etapa.unica ? 1 : selecionadas.length}
              absorvidos={etapa.unica ? etapa.unica.secundarios.length : selecionadas.reduce((n, s) => n + s.contatos.length - 1, 0)}
              emMassa={!etapa.unica}
              aoVoltar={() => setEtapa({ tipo: "lista" })}
              aoConfirmar={() => (etapa.unica ? rodarUnica(etapa.unica) : rodarEmMassa())}
            />
          ) : etapa.tipo === "mesclando" ? (
            <Mesclando />
          ) : etapa.tipo === "concluida" ? (
            <MesclaConcluida
              contatos={etapa.contatos}
              falhas={etapa.falhas}
              aoVoltar={() => setEtapa({ tipo: "lista" })}
              aoVerContato={etapa.vencedor ? () => aoVerContato(etapa.vencedor!) : null}
              aoConcluir={fechar}
            />
          ) : (
            <FalhaDaMescla mensagem={etapa.mensagem} aoTentarDeNovo={etapa.repetir} aoFechar={fechar} />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
