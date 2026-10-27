"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { LinhaCriarTag } from "@/components/escale/ui/LinhaCriarTag";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useContact } from "@/hooks/contacts/useContact";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { ContatoNaoCarregado, useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { MAX_TAGS_DO_CONTATO } from "@/lib/escale/negocio/campos";
import type { Lead } from "@/lib/types/leads";
import { Plus, Search, X } from "@/lib/ui/icons-da-casca";

/**
 * AS TAGS DO CONTATO NO CABEÇALHO (fork Escale, Fase 1H; N6; print 01).
 *
 * Como na Clint: sem tags, "+ Adicionar tags"; com tags, os chips e só o "+".
 * O painel oferece a linha "Criar" (com a etiqueta nova) no alto da lista
 * quando não há correspondência. O × do chip pede confirmação. As tags são do
 * CONTATO (`contacts.tags`, `text[]`), gravadas inteiras pelo PATCH do contato.
 *
 * Revisão final do PR A: a lista nova é montada sobre o contato MAIS RECENTE do
 * cache, na hora de enviar (duas tags seguidas não se desfazem); antes de o
 * contato carregar nada se edita; o erro da API já vira toast no hook. Quem
 * monta põe `key` com o id do negócio.
 */
// Referência estável: o `?? []` novo a cada render desfaria o `useMemo` da lista.
const SEM_TAGS: string[] = [];

/** FORK ESCALE · Fase 2E (N6): a ficha do negócio entra pelo lead; a janela do contato, direto pelo contato. */
export function TagsDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  return <TagsDoContato contatoId={lead.contact_id ?? ""} pipelineId={pipelineId} tagsDeReserva={lead.contact_tags ?? undefined} />;
}

/** FORK ESCALE · Fase 2E (N6): as tags do contato, na ficha do negócio e na aba Contato da janela do contato. */
export function TagsDoContato({
  contatoId,
  pipelineId,
  tagsDeReserva,
}: {
  contatoId: string;
  pipelineId: string | null;
  tagsDeReserva?: string[];
}) {
  const t = useT();
  const org = useActiveOrg();
  const { data, isError } = useContact(contatoId);
  const { gravar } = useGravarContato(contatoId, pipelineId);
  const vocabulario = useContactTagVocabulary(org?.orgId ?? null).data ?? SEM_TAGS;
  const carregado = Boolean(data?.data);
  const tags = data?.data?.tags ?? tagsDeReserva ?? SEM_TAGS;
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);

  const termo = normalizarTag(busca);
  const faltam = useMemo(
    () => vocabulario.filter((v) => !tags.includes(v) && (!termo || v.includes(termo))),
    [vocabulario, tags, termo],
  );
  const podeCriar = termo !== "" && !vocabulario.includes(termo) && !tags.includes(termo);

  /** `montar` recebe as tags do contato mais recente e devolve a lista nova. */
  async function gravarTags(montar: (atuais: string[]) => string[]) {
    try {
      const enviou = await gravar((atual) => ({ tags: montar(atual.tags ?? []) }));
      if (enviou) toast.success(t("As alterações foram salvas com sucesso."));
    } catch (err) {
      // O erro da API já vira toast no `useUpdateContact` (showApiError).
      if (err instanceof ContatoNaoCarregado) toast.error(t("Não consegui carregar o contato."));
    }
  }
  async function adicionar(tag: string) {
    setAberto(false);
    setBusca("");
    if (tags.length >= MAX_TAGS_DO_CONTATO)
      return toast.error(t("O contato já tem o máximo de 20 tags."));
    await gravarTags((atuais) =>
      atuais.includes(tag) || atuais.length >= MAX_TAGS_DO_CONTATO ? atuais : [...atuais, tag],
    );
  }

  const semContato = !contatoId;
  const desligado = semContato || !carregado;
  const motivo = semContato
    ? t("Este negócio não tem contato.")
    : isError
      ? t("Não consegui carregar o contato.")
      : t("Carregando…");
  const gatilho = tags.length ? (
    <BotaoDaCasca
      variante="icone"
      tamanho="sm"
      aria-label={t("Adicionar tags")}
      title={desligado ? motivo : t("Adicionar tags")}
      disabled={desligado}
      className="disabled:pointer-events-auto disabled:cursor-not-allowed"
    >
      <Plus aria-hidden />
    </BotaoDaCasca>
  ) : (
    <BotaoDaCasca
      variante="texto"
      tamanho="sm"
      disabled={desligado}
      title={desligado ? motivo : undefined}
      className="disabled:pointer-events-auto disabled:cursor-not-allowed"
    >
      {t("+ Adicionar tags")}
    </BotaoDaCasca>
  );

  return (
    <div className="ml-4 flex min-w-0 items-center gap-2">
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <li key={tag} className="flex items-center">
            <ChipDaTag tag={tag} />
            <button
              type="button"
              aria-label={`${t("Remover a tag")} ${tag}`}
              disabled={desligado}
              title={desligado ? motivo : undefined}
              onClick={() => setRemovendo(tag)}
              className="-ml-1 grid size-4 place-items-center rounded-full text-casca-suave hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed"
            >
              <X size={12} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
        <PainelSuspenso className="w-[260px] p-2">
          <span className="relative block">
            <input
              type="search"
              autoFocus
              aria-label={t("Adicione uma tag")}
              placeholder={t("Adicione uma tag")}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && podeCriar) void adicionar(termo);
              }}
              className="h-8 w-full rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
            />
            <Search
              size={14}
              aria-hidden
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
            />
          </span>
          <ul
            role="listbox"
            aria-label={t("Adicione uma tag")}
            className="mt-2 max-h-[240px] overflow-y-auto"
          >
            {podeCriar ? (
              <li>
                <LinhaCriarTag tag={termo} aoCriar={(tag) => void adicionar(tag)} />
              </li>
            ) : null}
            {faltam.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void adicionar(tag)}
                  className="flex h-[34px] w-full items-center rounded-md px-2 text-left text-[11px] text-casca-texto hover:bg-casca-marca-suave"
                >
                  <ChipDaTag tag={tag} />
                </button>
              </li>
            ))}
            {faltam.length === 0 && !podeCriar ? (
              <li className="px-2 py-3 text-[11px] text-casca-suave">
                {t("Nenhuma tag correspondente")}
              </li>
            ) : null}
          </ul>
        </PainelSuspenso>
      </Popover>
      <AlertDialog open={removendo !== null} onOpenChange={(a) => !a && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Deseja remover esta tag do contato?")}</AlertDialogTitle>
            <AlertDialogDescription>{removendo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tag = removendo;
                setRemovendo(null);
                if (tag) void gravarTags((atuais) => atuais.filter((x) => x !== tag));
              }}
            >
              {t("Remover")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
