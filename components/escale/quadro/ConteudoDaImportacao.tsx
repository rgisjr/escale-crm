"use client";
import { useState, type DragEvent, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DA_IMPORTACAO,
  type ChaveDaImportacao,
  type MapaDaImportacao,
} from "@/lib/escale/importar/mapear";
import {
  Check,
  CheckCircle2,
  CircleMinus,
  CircleX,
  CloudUpload,
  Columns2,
  Download,
  Flag,
  Plus,
  X,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * AS TELAS DOS PASSOS DA IMPORTAÇÃO (fork Escale, Fase 1E; Clint v2, v2-06 a
 * v2-11). Cada passo é um componente de apresentação: o estado e o envio moram
 * em `JanelaDeImportarNegocios`.
 */

export interface ResumoDaImportacao {
  total_linhas: number;
  criados: number;
  contatos_criados: number;
  erros: Array<{ linha: number; motivo: string }>;
  colunas_ignoradas: string[];
}

export interface EtapaDaImportacao {
  id: string;
  name: string;
}

const TITULO = "text-[22px] leading-8 font-medium text-casca-texto";
const SUBTITULO = "mt-1 text-[13px] leading-5 text-[#5A5964]";
const CABECALHO_DO_SELETOR = "h-8";

function ColunaCentral({ largura, children }: { largura: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full", largura)}>{children}</div>;
}

function Titulo({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div className="text-center">
      <h2 className={TITULO}>{titulo}</h2>
      <p className={SUBTITULO}>{subtitulo}</p>
    </div>
  );
}

/** O seletor "Contatos / Negócios": pílulas de 28px, a ativa branca com sombra curta. */
function SeletorDoTipo() {
  const t = useT();
  const pilula = "h-7 rounded-[6px] px-3 text-[12px] font-medium";
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-[8px] bg-[#F4F4F7] p-0.5">
      <button
        type="button"
        role="tab"
        aria-selected={false}
        disabled
        title={t("Importe contatos em Contatos")}
        className={cn(pilula, "cursor-not-allowed text-[#5A5964]")}
      >
        {t("Contatos")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected
        className={cn(pilula, "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]")}
      >
        {t("Negócios")}
      </button>
    </div>
  );
}

export function PassoArquivo({
  nomeDoArquivo,
  erro,
  aoEscolher,
}: {
  nomeDoArquivo: string | null;
  erro: string | null;
  aoEscolher: (arquivo: File) => void;
}) {
  const t = useT();
  const [arrastando, setArrastando] = useState(false);
  const pronto = nomeDoArquivo !== null;

  function soltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    const arquivo = e.dataTransfer.files[0];
    if (arquivo) aoEscolher(arquivo);
  }

  return (
    <ColunaCentral largura="max-w-[640px]">
      <SeletorDoTipo />
      <h2 className={cn(TITULO, "mt-9")}>{t("Escolha o arquivo .CSV para criar negócios")}</h2>
      <p className="mt-3 text-[13px] leading-5 text-[#5A5964]">
        {t(
          "Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Escale OS.",
        )}
      </p>
      <a
        href="/api/v1/leads/import"
        download
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-casca-marca hover:underline"
      >
        <Download size={14} aria-hidden />
        {t("Baixar arquivo de exemplo .CSV")}
      </a>
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
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) aoEscolher(arquivo);
          }}
        />
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[6px] text-white",
            pronto ? "bg-[#2FB36B]" : "bg-casca-marca",
          )}
        >
          {pronto ? <CheckCircle2 size={22} /> : <CloudUpload size={22} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-5 font-medium text-casca-texto">
            {pronto ? nomeDoArquivo : t("Arraste o arquivo aqui ou clique para selecionar")}
          </span>
          <span className="block text-[12px] leading-5 text-[#5A5964]">
            {pronto ? t("Pronto para mapear") : t("Formato .CSV")}
          </span>
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

function LinhaDoMapa({
  titulo,
  indice,
  mapa,
  aoMudar,
}: {
  titulo: string;
  indice: number;
  mapa: MapaDaImportacao;
  aoMudar: (indice: number, chave: ChaveDaImportacao | null) => void;
}) {
  const t = useT();
  const nome = titulo.trim() || `${t("Coluna")} ${indice + 1}`;
  const atual = mapa[indice] ?? null;
  const opcoes = CAMPOS_DA_IMPORTACAO.map((c) => ({
    valor: c.chave,
    rotulo: t(c.rotulo),
    grupo: c.grupo === "contato" ? t("Contato") : t("Negócio"),
    desabilitada: mapa.includes(c.chave) && atual !== c.chave,
  }));
  return (
    <li className="grid h-14 grid-cols-[1fr_390px] items-center border-t border-[#ECEBF1] px-4 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2">
        <Columns2 size={14} aria-hidden className="shrink-0 text-[#86858F]" />
        <span className={cn("truncate text-[13px]", atual ? "text-casca-texto" : "text-[#86858F]")}>
          {nome}
        </span>
      </span>
      <div className="relative">
        <SeletorDaCasca
          valor={atual ?? ""}
          opcoes={opcoes}
          aoMudar={(v) => aoMudar(indice, v === "" ? null : v)}
          vazio={t("Não importar esse campo")}
          aria-label={`${t("Campo da coluna")} ${nome}`}
          className={CABECALHO_DO_SELETOR}
        />
        {atual ? (
          <button
            type="button"
            aria-label={`${t("Não importar esse campo")}: ${nome}`}
            onClick={() => aoMudar(indice, null)}
            className="absolute top-1/2 right-9 grid size-5 -translate-y-1/2 place-items-center rounded-full text-[#86858F] hover:text-casca-texto"
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          <X
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-9.5 -translate-y-1/2 text-[#86858F]"
          />
        )}
      </div>
    </li>
  );
}

export function PassoMapeamento({
  cabecalho,
  mapa,
  aoMudar,
}: {
  cabecalho: readonly string[];
  mapa: MapaDaImportacao;
  aoMudar: (indice: number, chave: ChaveDaImportacao | null) => void;
}) {
  const t = useT();
  const rotuloDaColuna = "text-[10px] font-medium tracking-[0.06em] text-[#86858F] uppercase";
  return (
    <>
      <Titulo
        titulo={t("Mapeie os campos do seu arquivo")}
        subtitulo={t("Ligue cada coluna do seu arquivo a um campo da Escale OS.")}
      />
      <ColunaCentral largura="max-w-[720px]">
        <div className="mt-4 mb-3 flex justify-end">
          <button
            type="button"
            disabled
            title={t("Em breve")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-casca-marca disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar campo")}
          </button>
        </div>
        <div className="overflow-hidden rounded-[8px] border border-[#ECEBF1]">
          <div className="grid h-8 grid-cols-[1fr_390px] items-center bg-[#FAFAFC] px-4">
            <span className={rotuloDaColuna}>{t("Coluna do arquivo")}</span>
            <span className={rotuloDaColuna}>{t("Mapear para")}</span>
          </div>
          <ul>
            {cabecalho.map((titulo, i) => (
              <LinhaDoMapa key={i} titulo={titulo} indice={i} mapa={mapa} aoMudar={aoMudar} />
            ))}
          </ul>
        </div>
      </ColunaCentral>
    </>
  );
}

function EscolhaDeTags({
  tagsDoQuadro,
  escolhidas,
  aoMudar,
}: {
  tagsDoQuadro: readonly string[];
  escolhidas: readonly string[];
  aoMudar: (tags: string[]) => void;
}) {
  const t = useT();
  const alternar = (tag: string, marcada: boolean) =>
    aoMudar(marcada ? [...escolhidas, tag] : escolhidas.filter((x) => x !== tag));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#D9D8E0] px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar tag")}
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-64 p-2" sideOffset={6}>
          {tagsDoQuadro.length === 0 ? (
            <p className="px-1 py-1 text-[12px] text-casca-suave">
              {t("Este quadro ainda não tem tags.")}
            </p>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto p-1">
              {tagsDoQuadro.map((tag) => (
                <li key={tag}>
                  <CaixaDaCasca
                    marcada={escolhidas.includes(tag)}
                    aoMudar={(m) => alternar(tag, m)}
                    rotulo={tag}
                  />
                </li>
              ))}
            </ul>
          )}
        </PainelSuspenso>
      </Popover>
      {escolhidas.map((tag) => (
        <span
          key={tag}
          data-tag-escolhida
          className="inline-flex h-6 items-center gap-1 rounded-full bg-casca-marca-suave pr-1 pl-2.5 text-[12px] font-medium text-casca-marca"
        >
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`${t("Remover tag")} ${tag}`}
            onClick={() => alternar(tag, false)}
            className="grid size-4 place-items-center rounded-full hover:bg-white"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

function CampoDaConfiguracao({
  rotulo,
  obrigatorio,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[13px] leading-5 font-medium text-casca-texto">
        {rotulo}
        {obrigatorio ? (
          <span aria-hidden className="ml-1 text-casca-alerta">
            *
          </span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

const STATUS_BASE =
  "flex h-10 items-center justify-center gap-2 rounded-[6px] border text-[13px] disabled:cursor-not-allowed disabled:opacity-60";

export function PassoConfiguracoes({
  nomeDaOrigem,
  etapas,
  etapa,
  aoMudarEtapa,
  tagsDoQuadro,
  tags,
  aoMudarTags,
}: {
  nomeDaOrigem: string;
  etapas: readonly EtapaDaImportacao[];
  etapa: string;
  aoMudarEtapa: (id: string) => void;
  tagsDoQuadro: readonly string[];
  tags: readonly string[];
  aoMudarTags: (tags: string[]) => void;
}) {
  const t = useT();
  return (
    <>
      <Titulo
        titulo={t("Configurações da importação")}
        subtitulo={t(
          "Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos.",
        )}
      />
      <ColunaCentral largura="max-w-[560px]">
        <div className="mt-5">
          <p className="text-[13px] leading-5 font-medium text-casca-texto">
            {t("Tags do contato")}
          </p>
          <p className="text-[12px] leading-5 text-[#5A5964]">
            {t("Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação.")}
          </p>
          <EscolhaDeTags tagsDoQuadro={tagsDoQuadro} escolhidas={tags} aoMudar={aoMudarTags} />
        </div>
        <CampoDaConfiguracao rotulo={t("Origem de destino")}>
          <SeletorDaCasca
            valor="origem"
            opcoes={[{ valor: "origem", rotulo: nomeDaOrigem }]}
            aoMudar={() => {}}
            aria-label={t("Origem de destino")}
            desabilitado
            dica={t("A importação entra nesta origem")}
            className={CABECALHO_DO_SELETOR}
          />
        </CampoDaConfiguracao>
        <CampoDaConfiguracao rotulo={t("Etapa inicial padrão")} obrigatorio>
          <SeletorDaCasca
            valor={etapa}
            opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.name }))}
            aoMudar={(v) => {
              if (v) aoMudarEtapa(v);
            }}
            aria-label={t("Etapa inicial padrão")}
            className={CABECALHO_DO_SELETOR}
          />
        </CampoDaConfiguracao>
        <CampoDaConfiguracao rotulo={t("Status")}>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed
              className={cn(
                STATUS_BASE,
                "border-casca-marca bg-casca-marca-suave text-casca-marca",
              )}
            >
              <CircleMinus size={16} aria-hidden />
              {t("Aberto")}
            </button>
            <button
              type="button"
              disabled
              title={t("Em breve")}
              className={cn(STATUS_BASE, "border-[#E4E4E9] text-[#1F9D55]")}
            >
              <CheckCircle2 size={16} aria-hidden />
              {t("Ganho")}
            </button>
            <button
              type="button"
              disabled
              title={t("Em breve")}
              className={cn(STATUS_BASE, "border-[#E4E4E9] text-[#D1264F]")}
            >
              <CircleX size={16} aria-hidden />
              {t("Perdido")}
            </button>
          </div>
        </CampoDaConfiguracao>
      </ColunaCentral>
    </>
  );
}

function LinhaDoResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex h-9 items-center justify-between border-t border-[#ECEBF1] px-4 text-[13px] first:border-t-0">
      <dt className="text-[#5A5964]">{rotulo}</dt>
      <dd className="min-w-0 truncate pl-4 text-casca-texto">{valor}</dd>
    </div>
  );
}

export function PassoPrevia({
  nomeDoArquivo,
  camposMapeados,
  nomeDaEtapa,
  linhas,
}: {
  nomeDoArquivo: string;
  camposMapeados: number;
  nomeDaEtapa: string;
  linhas: number;
}) {
  const t = useT();
  return (
    <>
      <Titulo
        titulo={t("Confira e confirme a importação")}
        subtitulo={t("Revise os detalhes antes de iniciar.")}
      />
      <ColunaCentral largura="max-w-[640px]">
        <dl
          data-testid="resumo-da-importacao"
          className="mt-5 rounded-[8px] border border-[#ECEBF1]"
        >
          <LinhaDoResumo rotulo={t("Arquivo")} valor={nomeDoArquivo} />
          <LinhaDoResumo rotulo={t("Tipo")} valor={t("Negócios")} />
          <LinhaDoResumo rotulo={t("Campos mapeados")} valor={String(camposMapeados)} />
          <LinhaDoResumo rotulo={t("Etapa")} valor={nomeDaEtapa} />
          <LinhaDoResumo rotulo={t("Linhas")} valor={String(linhas)} />
        </dl>
        <div className="mt-5 flex gap-3 rounded-[8px] bg-[#F8F8FA] p-4">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-[#FFEBD6] text-[#C2570C]"
          >
            <Flag size={16} />
          </span>
          <div>
            <p className="text-[13px] leading-5 font-medium text-casca-texto">
              {t("A importação conclui agora.")}
            </p>
            <p className="text-[12px] leading-5 text-[#5A5964]">
              {t(
                "Os negócios entram na etapa escolhida. As linhas recusadas aparecem com o motivo logo depois.",
              )}
            </p>
          </div>
        </div>
      </ColunaCentral>
    </>
  );
}

const contar = (n: number, singular: string, plural: string) =>
  (n === 1 ? singular : plural).replace("{n}", String(n));

const recusada = (texto: string, e: { linha: number; motivo: string }) =>
  texto.replace("{linha}", String(e.linha)).replace("{motivo}", e.motivo);

export function PassoPronto({ resumo }: { resumo: ResumoDaImportacao }) {
  const t = useT();
  return (
    <ColunaCentral largura="max-w-[640px]">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[#2FB36B] text-white"
        >
          <Check size={22} strokeWidth={3} />
        </span>
        <h2 className={TITULO}>{t("Importação concluída")}</h2>
        <p className="mt-3 text-[15px] leading-6 font-medium text-casca-texto">
          {contar(resumo.criados, t("{n} negócio criado"), t("{n} negócios criados"))}
        </p>
        <p className="text-[15px] leading-6 font-medium text-casca-texto">
          {contar(resumo.contatos_criados, t("{n} contato criado"), t("{n} contatos criados"))}
        </p>
      </div>
      {resumo.erros.length > 0 ? (
        <ul className="mt-6 max-h-48 divide-y divide-[#ECEBF1] overflow-y-auto rounded-[8px] border border-[#ECEBF1]">
          {resumo.erros.map((e) => (
            <li key={`${e.linha}-${e.motivo}`} className="px-4 py-2 text-[13px] text-casca-texto">
              {recusada(t("Linha {linha}: {motivo}"), e)}
            </li>
          ))}
        </ul>
      ) : null}
    </ColunaCentral>
  );
}
