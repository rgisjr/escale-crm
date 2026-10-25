"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JanelaDeNovoDocumento } from "@/components/escale/negocio/abas/JanelaDeNovoDocumento";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useArquivosDoContato, useEnviarArquivos } from "@/hooks/escale/useArquivosDoContato";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { dataHoraBr, familiaDaExtensao, formatarTamanho } from "@/lib/escale/negocio/arquivos";
import {
  CloudUpload,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  Search,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

const ICONE: Record<string, LucideIcon> = {
  imagem: FileImage,
  planilha: FileSpreadsheet,
  audio: FileAudio,
  video: FileVideo,
  pacote: FileArchive,
  documento: FileText,
};
const COTA_GB = 5;
const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(2).replace(".", ",");

/** A seção Anexos (c50): busca, "Novo arquivo", o uso, a lista (1H) e o vazio da Clint. */
export function SecaoAnexos({
  conversa,
  quadro,
  aoVoltar,
}: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  aoVoltar: () => void;
}) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isLoading, isError } = useArquivosDoContato(contactId);
  const enviar = useEnviarArquivos(contactId, quadro?.lead.id ?? null);
  const podeEnviar = usePermission("contact.update");
  const [busca, setBusca] = useState("");
  const [janela, setJanela] = useState(false);
  const lista = useMemo(
    () =>
      (data ?? []).filter(
        (a) => !busca.trim() || a.nome.toLowerCase().includes(busca.trim().toLowerCase()),
      ),
    [data, busca],
  );
  const usado = (data ?? []).reduce((n, a) => n + a.tamanho, 0);

  async function salvar(arquivos: File[]): Promise<File[]> {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas)
      toast.error(`${f.nome}: ${f.mensagem ?? t("Erro ao enviar arquivo(s)")}`);
    return r.falhas.map((f) => f.arquivo);
  }
  const botaoNovo = (
    <button
      type="button"
      disabled={!podeEnviar}
      title={podeEnviar ? undefined : t("Sem permissão")}
      onClick={() => setJanela(true)}
      className="flex h-8 items-center justify-center gap-1 rounded-casca-gatilho border border-casca-borda px-3 text-[14px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
    >
      <CloudUpload size={14} aria-hidden />
      {t("Novo arquivo")}
    </button>
  );

  return (
    <SecaoAberta titulo={t("Anexos")} icone={ICONE_DA_SECAO.anexos} aoVoltar={aoVoltar}>
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Pesquisar…")}
            aria-label={t("Pesquisar…")}
            className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[14px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
          />
          <Search
            size={14}
            aria-hidden
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
          />
        </label>
        {botaoNovo}
      </div>
      <p className="text-[12px] text-casca-suave">{`${gb(usado)} GB / ${COTA_GB.toFixed(2).replace(".", ",")} GB ${t("usados")}`}</p>
      {isLoading ? (
        <p className="text-[14px] text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="text-[14px] text-casca-suave">
          {t("Não foi possível carregar os arquivos.")}
        </p>
      ) : lista.length === 0 ? (
        <VazioDaCasca
          className="pt-4"
          icone={Paperclip}
          titulo={t("Nenhum arquivo encontrado")}
          texto={t("Envie arquivos para mantê-los junto deste contato.")}
          acao={botaoNovo}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((a) => {
            const Icone = ICONE[familiaDaExtensao(a.extensao)] ?? File;
            return (
              <li key={a.id}>
                <a
                  href={`/api/v1/contacts/${contactId}/arquivos/${a.id}`}
                  className="flex h-12 items-center gap-3 rounded-[8px] border border-casca-borda px-3 hover:bg-casca-raia"
                >
                  <Icone size={16} aria-hidden className="shrink-0 text-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-medium text-casca-texto">
                      {a.nome}
                    </span>
                    <span className="text-[12px] text-casca-suave">{`${formatarTamanho(a.tamanho)} · ${dataHoraBr(a.created_at)}`}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <JanelaDeNovoDocumento aberta={janela} onFechar={() => setJanela(false)} aoSalvar={salvar} />
    </SecaoAberta>
  );
}
