"use client";
import { useState, type DragEvent } from "react";

import { useT } from "@/hooks/i18n/useT";
import { csvDeExemplo, nomeDoExemplo } from "@/lib/escale/importacao/exemplo";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { CheckCircle2, CloudUpload, Download, Loader2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, SeletorDoTipo, TITULO } from "./pecas";

function baixarExemplo(tipo: TipoDeImportacao) {
  const url = URL.createObjectURL(new Blob([csvDeExemplo(tipo)], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoExemplo(tipo);
  a.click();
  URL.revokeObjectURL(url);
}

export function PassoArquivo({
  tipo,
  aoMudarTipo,
  travarTipo,
  nomeDoArquivo,
  lendo,
  erro,
  aoEscolher,
}: {
  tipo: TipoDeImportacao;
  aoMudarTipo: (tipo: TipoDeImportacao) => void;
  travarTipo: boolean;
  nomeDoArquivo: string | null;
  lendo: boolean;
  erro: string | null;
  aoEscolher: (arquivo: File) => void;
}) {
  const t = useT();
  const [arrastando, setArrastando] = useState(false);
  const pronto = nomeDoArquivo !== null && !lendo;

  function soltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    const arquivo = e.dataTransfer.files[0];
    if (arquivo) aoEscolher(arquivo);
  }

  return (
    <ColunaCentral largura="max-w-[640px]">
      <SeletorDoTipo tipo={tipo} aoMudar={aoMudarTipo} desabilitado={travarTipo || lendo} />
      <h2 className={cn(TITULO, "mt-9")}>
        {tipo === "negocio" ? t("Escolha o arquivo .CSV para criar negócios") : t("Escolha o arquivo .CSV para criar contatos")}
      </h2>
      <p className="mt-3 text-[13px] leading-5 text-[#5A5964]">
        {t(
          "Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Escale OS.",
        )}
      </p>
      <button
        type="button"
        onClick={() => baixarExemplo(tipo)}
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-casca-marca hover:underline"
      >
        <Download size={14} aria-hidden />
        {t("Baixar arquivo de exemplo .CSV")}
      </button>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={cn(
          "mt-8 flex h-[76px] cursor-pointer items-center gap-4 rounded-[8px] border border-dashed px-4 focus-within:ring-2 focus-within:ring-casca-marca",
          pronto ? "border-[#2FB36B] bg-[#EEFBF2]" : "border-[#E4E4E9] bg-[#F8F8FA]",
          arrastando && "border-casca-marca",
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label={t("Arquivo .CSV")}
          className="sr-only"
          disabled={lendo}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) aoEscolher(arquivo);
          }}
        />
        <span
          aria-hidden
          className={cn("grid size-11 shrink-0 place-items-center rounded-[6px] text-white", pronto ? "bg-[#2FB36B]" : "bg-casca-marca")}
        >
          {lendo ? <Loader2 size={20} className="animate-spin" /> : pronto ? <CheckCircle2 size={22} /> : <CloudUpload size={22} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-5 font-medium text-casca-texto">
            {pronto ? nomeDoArquivo : lendo ? t("Enviando arquivo…") : t("Arraste o arquivo aqui ou clique para selecionar")}
          </span>
          <span className="block text-[12px] leading-5 text-[#5A5964]">{pronto ? t("Pronto para mapear") : t("Formato .CSV")}</span>
        </span>
      </label>
      {erro ? (
        <p role="alert" className="mt-3 text-[12px] text-casca-alerta">
          {erro}
        </p>
      ) : null}
    </ColunaCentral>
  );
}
