"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect } from "react";
import { toast } from "sonner";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { TagsDoContato } from "@/components/escale/negocio/TagsDaFicha";
import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import { AbaEmpresa, ContatoEditavel } from "@/components/escale/negocio/abas/AbasDeCampos";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useContact } from "@/hooks/contacts/useContact";
import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useEmpresaDoContato } from "@/hooks/escale/useEmpresaDoContato";
import { useFichaDeNegociosDoContato } from "@/hooks/escale/useFichaDeNegociosDoContato";
import { useSugestaoDoContato } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { ROTULO_DA_ABA_DO_CONTATO, abasVisiveis, type AbaDoContato } from "@/lib/escale/ficha-do-contato/regras";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AbaNegociosDoContato } from "./AbaNegociosDoContato";
import { CabecalhoDoContato } from "./CabecalhoDoContato";

export type ContatoParaNegocio = Pick<LinhaDeContato, "id" | "nome" | "display_name" | "telefone">;

/**
 * A JANELA "INFORMAÇÕES DO CONTATO" (fork Escale, Fase 2E; C3; print 2b-10;
 * Clint `index-BhVJ8kAx`). Por cima da lista, com o cabeçalho da Clint e as
 * abas Contato, Empresa, Negócios (só com negócio), Conversas, Arquivos e
 * Histórico, que são as da ficha do negócio servindo ao contato (N5). Mesclado
 * por fora: troca para o vencedor; excluído: avisa e fecha.
 */
export function JanelaDoContato({
  contatoId,
  aba,
  aoMudarAba,
  aoTrocarContato,
  aoFechar,
  podeCriarNegocio,
  podeMesclar,
  aoAdicionarNegocio,
  aoRevisarDuplicado,
}: {
  contatoId: string;
  aba: AbaDoContato;
  aoMudarAba: (aba: AbaDoContato) => void;
  aoTrocarContato: (id: string) => void;
  aoFechar: () => void;
  podeCriarNegocio: boolean;
  podeMesclar: boolean;
  aoAdicionarNegocio: (contato: ContatoParaNegocio) => void;
  aoRevisarDuplicado: (contatoId: string) => void;
}) {
  const t = useT();
  const consulta = useContact(contatoId);
  const contato = consulta.data?.data ?? null;
  const negocios = useFichaDeNegociosDoContato(contatoId);
  const empresa = useEmpresaDoContato(contatoId).data ?? null;
  const conversas = useConversasDoContato(contatoId).data ?? [];
  const sugestao = useSugestaoDoContato(contatoId, podeMesclar);

  const temNegocios = (negocios.data?.negocios.length ?? 0) > 0;
  const abas = abasVisiveis(temNegocios);
  const atual = abas.includes(aba) ? aba : "contato";
  const sumiu = consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 404;
  const vencedor = contato?.is_merged_into ?? null;

  useEffect(() => {
    if (vencedor) {
      toast.success(t("Contato mesclado"));
      aoTrocarContato(vencedor);
    }
  }, [vencedor, aoTrocarContato, t]);
  useEffect(() => {
    if (sumiu) {
      toast.error(t("Contato excluído"));
      aoFechar();
    }
  }, [sumiu, aoFechar, t]);

  const nome = (contato ? nomeDoContato(contato) : null) ?? contato?.phone_number ?? "";

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[46px] left-1/2 z-50 flex h-[calc(100dvh-46px)] w-[calc(100vw-96px)] max-w-[1428px] -translate-x-1/2 flex-col rounded-t-[8px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <DialogPrimitive.Title className="text-[15px] font-medium text-casca-texto">
              {t("Informações do contato")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="mr-1 grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[60px] pt-[26px] pb-6">
            {!contato ? (
              <div aria-busy className="flex animate-pulse items-center gap-3">
                <span className="size-10 rounded-full bg-casca-raia" />
                <span className="h-5 w-48 rounded-md bg-casca-raia" />
              </div>
            ) : (
              <>
                <CabecalhoDoContato
                  contato={{ id: contato.id, nome, telefone: contato.phone_number }}
                  empresa={empresa?.nome ?? null}
                  conversaId={conversas[0]?.id ?? null}
                  duplicado={podeMesclar && sugestao !== null}
                  podeCriarNegocio={podeCriarNegocio}
                  aoAdicionarNegocio={() =>
                    aoAdicionarNegocio({ id: contato.id, nome: contato.name ?? nome, display_name: contato.display_name, telefone: contato.phone_number })
                  }
                  aoRevisarDuplicado={() => aoRevisarDuplicado(contato.id)}
                />
                <div role="tablist" aria-label={t("Informações do contato")} className="mt-[22px] flex shrink-0 gap-6 border-b border-casca-borda">
                  {abas.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="tab"
                      aria-selected={a === atual}
                      onClick={() => aoMudarAba(a)}
                      className={cn(
                        "relative px-[11px] pb-2.5 text-[14px] text-casca-texto",
                        a === atual && "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-casca-marca",
                      )}
                    >
                      {t(ROTULO_DA_ABA_DO_CONTATO[a])}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" className="mt-5 flex min-h-0 flex-1 flex-col">
                  {atual === "contato" ? (
                    <>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-[13px] text-casca-suave">{t("Tags")}</span>
                        <TagsDoContato contatoId={contato.id} pipelineId={null} tagsDeReserva={contato.tags} />
                      </div>
                      <ContatoEditavel contatoId={contato.id} pipeline={null} />
                    </>
                  ) : atual === "empresa" ? (
                    <AbaEmpresa contatoId={contato.id} />
                  ) : atual === "negocios" && negocios.data ? (
                    <AbaNegociosDoContato contatoId={contato.id} ficha={negocios.data} />
                  ) : atual === "conversas" ? (
                    <AbaConversas contatoId={contato.id} foto={<FotoDaLinha id={contato.id} nome={nome} temFoto tamanho="conversa" />} />
                  ) : atual === "arquivos" ? (
                    <AbaArquivos contatoId={contato.id} leadId={null} />
                  ) : atual === "historico" ? (
                    <AbaHistorico alvo={{ tipo: "contato", id: contato.id }} nomesDasEtapas={negocios.data?.etapas ?? {}} />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
