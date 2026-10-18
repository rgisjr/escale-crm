"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useActiveOrg, usePermission, useUser } from "@/hooks/auth/AuthProvider";
import {
  useArquivosDoContato,
  useEnviarArquivos,
  useExcluirArquivo,
} from "@/hooks/escale/useArquivosDoContato";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import {
  EXTENSOES_ACEITAS,
  MAX_ARQUIVO_MB,
  dataHoraBr,
  familiaDaExtensao,
  filtrarArquivos,
  formatarTamanho,
  ordenarArquivos,
  rotaDosArquivos,
  type Arquivo,
  type ColunaDeArquivos,
  type Direcao,
  type FamiliaDoArquivo,
} from "@/lib/escale/negocio/arquivos";
import { formatarDataBr } from "@/lib/escale/ui/periodos";
import {
  ArrowUpDown,
  ChevronDown,
  CloudUpload,
  Download,
  EllipsisVertical,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Search,
  Trash2,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { JanelaDeNovoDocumento } from "./JanelaDeNovoDocumento";

/**
 * A ABA ARQUIVOS DA FICHA (fork Escale, Fase 1H; C17, N8; print 06 e 01-001).
 *
 * Os arquivos são do CONTATO (como na Clint). Barra: busca, Data (dois
 * calendários com atalhos), Tipo de arquivo (extensões, múltipla), "Limpar
 * filtros", o "?" e "Novo arquivo". Tabela ordenável; o ⋯ da linha baixa ou
 * exclui (o autor, ou gerente ou acima). Sem o medidor de cota (PRD §9).
 */
const ICONE_DA_FAMILIA: Record<FamiliaDoArquivo, LucideIcon> = {
  imagem: FileImage,
  planilha: FileSpreadsheet,
  audio: FileAudio,
  video: FileVideo,
  pacote: FileArchive,
  documento: FileText,
};
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

/** Abre o arquivo pela rota de download (302 para a URL assinada), em outra aba. */
function abrirArquivo(a: Arquivo) {
  window.open(`${rotaDosArquivos(a.contact_id)}/${a.id}`, "_blank", "noopener,noreferrer");
}

export function AbaArquivos({ lead }: { lead: Lead }) {
  const t = useT();
  const contactId = lead.contact_id;
  const { data, isLoading, isError } = useArquivosDoContato(contactId);
  const enviar = useEnviarArquivos(contactId ?? "", lead.id);
  const excluir = useExcluirArquivo(contactId ?? "");
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const podeEnviar = usePermission("contact.update");

  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<{ de?: string; ate?: string }>({});
  const [extensoes, setExtensoes] = useState<string[]>([]);
  const [coluna, setColuna] = useState<ColunaDeArquivos>("data");
  const [direcao, setDirecao] = useState<Direcao>("desc");
  const [janela, setJanela] = useState(false);
  const [excluindo, setExcluindo] = useState<Arquivo | null>(null);

  const lista = useMemo(
    () =>
      ordenarArquivos(
        filtrarArquivos(data ?? [], { busca, ...periodo, extensoes }),
        coluna,
        direcao,
      ),
    [data, busca, periodo, extensoes, coluna, direcao],
  );
  const temFiltro = !!busca || !!periodo.de || extensoes.length > 0;

  function ordenarPor(c: ColunaDeArquivos) {
    if (c === coluna) setDirecao(direcao === "asc" ? "desc" : "asc");
    else {
      setColuna(c);
      setDirecao(c === "data" ? "desc" : "asc");
    }
  }

  /** Envia e devolve os arquivos que falharam (o modal fica aberto só com eles). */
  async function salvarNovos(arquivos: File[]): Promise<File[]> {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas) {
      toast.error(`${f.nome}: ${f.mensagem ?? t("Erro ao enviar arquivo(s)")}`);
    }
    return r.falhas.map((f) => f.arquivo);
  }

  async function confirmarExclusao() {
    const alvo = excluindo;
    setExcluindo(null);
    if (!alvo) return;
    try {
      await excluir.mutateAsync(alvo.id);
      toast.success(t("Arquivo excluído com sucesso"));
    } catch {
      toast.error(t("Erro ao excluir arquivo"));
    }
  }

  const semContato = !contactId;
  const botaoNovo = (className?: string) => (
    <BotaoDaCasca
      variante="texto"
      tamanho="sm"
      disabled={semContato || !podeEnviar}
      title={
        semContato
          ? t("Este negócio não tem contato.")
          : !podeEnviar
            ? t("Sem permissão")
            : undefined
      }
      className={cn("border border-casca-borda", EM_BREVE, className)}
      onClick={() => setJanela(true)}
    >
      <CloudUpload aria-hidden />
      {t("Novo arquivo")}
    </BotaoDaCasca>
  );
  const gatilho =
    "flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-casca-texto hover:bg-casca-raia";
  const resumoDoPeriodo = periodo.de
    ? periodo.ate
      ? t("De {de} a {ate}")
          .replace("{de}", formatarDataBr(periodo.de))
          .replace("{ate}", formatarDataBr(periodo.ate))
      : t("A partir de {de}").replace("{de}", formatarDataBr(periodo.de))
    : t("Data");

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative">
            <input
              type="search"
              aria-label={t("Pesquisar...")}
              placeholder={t("Pesquisar...")}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
            />
            <Search
              size={14}
              aria-hidden
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
            />
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" title={t("Filtrar por data de upload")} className={gatilho}>
                {resumoDoPeriodo}
                <ChevronDown size={14} aria-hidden />
              </button>
            </PopoverTrigger>
            <PainelSuspenso>
              <CalendarioDePeriodo
                semAbas
                valor={{ tipo: "criacao", ...periodo }}
                aoMudar={(p) => setPeriodo({ de: p.de, ate: p.ate })}
              />
            </PainelSuspenso>
          </Popover>
          <SeletorMultiploDaCasca
            valores={extensoes}
            opcoes={EXTENSOES_ACEITAS.map((e) => ({ valor: e, rotulo: e.toUpperCase() }))}
            vazio={t("Tipo de arquivo")}
            aria-label={t("Tipo de arquivo")}
            dica={t("Filtrar por tipo de arquivo")}
            aoMudar={setExtensoes}
          />
          {temFiltro ? (
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              className="text-casca-marca"
              onClick={() => {
                setBusca("");
                setPeriodo({});
                setExtensoes([]);
              }}
            >
              {t("Limpar filtros")}
            </BotaoDaCasca>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <TooltipProvider delayDuration={150}>
            <AjudaDaCasca
              texto={t("Faça upload de arquivos de até {maxMb} MB para anexar ao contato").replace(
                "{maxMb}",
                String(MAX_ARQUIVO_MB),
              )}
            />
          </TooltipProvider>
          {botaoNovo()}
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border border-casca-borda">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 bg-surface">
            <tr className="h-11 border-b border-casca-borda text-[10px] font-semibold tracking-wide text-casca-texto uppercase">
              <Cabecalho
                rotulo={t("Arquivo")}
                ativa={coluna === "nome"}
                direcao={direcao}
                aoClicar={() => ordenarPor("nome")}
                className="text-left"
              />
              <Cabecalho
                rotulo={t("Data de upload")}
                ativa={coluna === "data"}
                direcao={direcao}
                aoClicar={() => ordenarPor("data")}
                className="w-[200px] text-right"
              />
              <Cabecalho
                rotulo={t("Usuário")}
                ativa={coluna === "usuario"}
                direcao={direcao}
                aoClicar={() => ordenarPor("usuario")}
                className="w-[120px] text-right"
              />
              <th scope="col" className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const Icone = ICONE_DA_FAMILIA[familiaDaExtensao(a.extensao)] ?? File;
              const podeExcluir = gerente || a.user_id === user.id;
              return (
                <tr
                  key={a.id}
                  onClick={() => abrirArquivo(a)}
                  className="group h-14 cursor-pointer border-b border-casca-borda last:border-b-0 hover:bg-casca-raia"
                >
                  <td className="px-3">
                    <span className="flex items-center gap-3">
                      <Icone size={20} aria-hidden className="shrink-0 text-casca-marca" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-casca-texto">
                          {a.nome}
                        </span>
                        <span className="block text-[11px] text-casca-meta">
                          {formatarTamanho(a.tamanho)}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 text-right text-[13px] text-casca-texto-2">
                    {dataHoraBr(a.created_at)}
                  </td>
                  <td className="px-3">
                    <span className="flex justify-end">
                      <span
                        title={a.user_nome ?? undefined}
                        className="grid size-6 place-items-center rounded-full bg-casca-marca-suave text-[11px] font-semibold text-casca-marca"
                      >
                        {(a.user_nome ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </span>
                  </td>
                  {/* O ⋯ não abre o arquivo: o clique na linha é só do resto dela. */}
                  <td className="px-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("Mais opções")}
                          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        >
                          <EllipsisVertical size={16} aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
                        <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => abrirArquivo(a)}>
                          <Download size={14} aria-hidden />
                          {t("Baixar arquivo")}
                        </DropdownMenuItem>
                        {podeExcluir ? (
                          <DropdownMenuItem
                            className={cn(ITEM_DO_MENU, "text-destructive")}
                            onSelect={() => setExcluindo(a)}
                          >
                            <Trash2 size={14} aria-hidden />
                            {t("Excluir")}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading ? (
          <p className="p-6 text-xs text-casca-suave">{t("Carregando…")}</p>
        ) : isError ? (
          <p className="p-6 text-xs text-casca-suave">{t("Não consegui carregar os arquivos.")}</p>
        ) : lista.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-xl bg-casca-marca-suave text-casca-marca">
              <FileText size={22} aria-hidden />
            </span>
            <p className="mt-2 text-[15px] font-semibold text-casca-texto">
              {t("Nenhum arquivo encontrado")}
            </p>
            <p className="max-w-[180px] text-[13px] text-casca-suave">
              {t("Envie arquivos para mantê-los junto deste contato.")}
            </p>
            {botaoNovo("mt-2")}
          </div>
        ) : null}
      </div>
      {contactId ? (
        <JanelaDeNovoDocumento
          aberta={janela}
          onFechar={() => setJanela(false)}
          aoSalvar={salvarNovos}
        />
      ) : null}
      <AlertDialog open={excluindo !== null} onOpenChange={(a) => !a && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Tem certeza que deseja apagar este arquivo?")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarExclusao()}>
              {t("Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Cabecalho({
  rotulo,
  ativa,
  direcao,
  aoClicar,
  className,
}: {
  rotulo: string;
  ativa: boolean;
  direcao: Direcao;
  aoClicar: () => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3", className)}
    >
      <button
        type="button"
        onClick={aoClicar}
        className="inline-flex items-center gap-1 uppercase hover:text-casca-marca"
      >
        {rotulo}
        <ArrowUpDown
          size={12}
          aria-hidden
          className={ativa ? "text-casca-marca" : "text-casca-suave"}
        />
      </button>
    </th>
  );
}
