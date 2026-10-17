"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, CloudUpload, FileText, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A ABA ARQUIVOS DA FICHA (fork Escale, Fase 1G, C2; print 06). O negócio ainda
 * não guarda arquivo: a aba é a moldura e o vazio da Clint. Enviar, buscar e
 * filtrar são da 1H (C17); o medidor de 5 GB fica fora (PRD §9).
 */
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AbaArquivos() {
  const t = useT();
  const gatilho = cn("flex h-8 items-center gap-1 px-2 text-[13px] text-casca-texto", EM_BREVE);
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative">
            <input
              disabled
              title={t("Em breve")}
              placeholder={t("Pesquisar...")}
              className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] placeholder:text-casca-meta disabled:cursor-not-allowed"
            />
            <Search
              size={14}
              aria-hidden
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
            />
          </span>
          <button type="button" disabled title={t("Em breve")} className={gatilho}>
            {t("Data")}
            <ChevronDown size={14} aria-hidden />
          </button>
          <button type="button" disabled title={t("Em breve")} className={gatilho}>
            {t("Tipo de arquivo")}
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>
        <BotaoDaCasca
          variante="texto"
          tamanho="sm"
          disabled
          title={t("Em breve")}
          className={cn("border border-casca-borda", EM_BREVE)}
        >
          <CloudUpload aria-hidden />
          {t("Novo arquivo")}
        </BotaoDaCasca>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-casca-borda">
        <table className="w-full table-fixed">
          <thead>
            <tr className="h-11 border-b border-casca-borda text-[10px] font-semibold tracking-wide text-casca-texto uppercase">
              <th scope="col" className="px-3 text-left">
                {t("Arquivo")}
              </th>
              <th scope="col" className="w-[200px] px-3 text-right">
                {t("Data de upload")}
              </th>
              <th scope="col" className="w-[120px] px-3 text-right">
                {t("Usuário")}
              </th>
            </tr>
          </thead>
        </table>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <span className="grid size-14 place-items-center rounded-xl bg-casca-marca-suave text-casca-marca">
            <FileText size={22} aria-hidden />
          </span>
          <p className="mt-2 text-[15px] font-semibold text-casca-texto">
            {t("Nenhum arquivo encontrado")}
          </p>
          <p className="max-w-[180px] text-[13px] text-casca-suave">
            {t("Envie arquivos para mantê-los junto deste contato.")}
          </p>
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            disabled
            title={t("Em breve")}
            className={cn("mt-2 border border-casca-borda", EM_BREVE)}
          >
            <CloudUpload aria-hidden />
            {t("Novo arquivo")}
          </BotaoDaCasca>
        </div>
      </div>
    </div>
  );
}
