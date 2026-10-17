"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useNegociosRecentes } from "@/hooks/escale/useNegociosRecentes";
import { useT } from "@/hooks/i18n/useT";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { linkDoRecente, VISIVEIS, type NegocioRecente } from "@/lib/escale/recentes/regras";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  Pin,
  PinOff,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecalhoDaSecao } from "./CabecalhoDaSecao";
import { DicaEscura } from "./DicaEscura";
import { BOTAO_DE_ICONE, LINHA, LINHA_COM_HOVER, SO_NO_HOVER } from "./estilos-do-painel";

/** Os dois ícones da linha (alfinete e seta) são #3E3A6F (`11b`). */
const ICONE_DA_LINHA = cn(BOTAO_DE_ICONE, "text-casca-texto-2 hover:text-casca-texto-2");

/** O quadrado de 20px com raio 5: a foto do contato (`11b`) ou, sem foto, a inicial. */
function FotoDoRecente({ r }: { r: NegocioRecente }) {
  if (r.foto) {
    // eslint-disable-next-line @next/next/no-img-element -- a foto vem do domínio do canal, que o next/image não conhece
    return <img src={r.foto} alt="" className="size-5 shrink-0 rounded-[5px] object-cover" />;
  }
  return (
    <span
      aria-hidden
      className="grid size-5 shrink-0 place-items-center rounded-[5px] text-[9px] leading-none font-semibold text-white"
      style={{ backgroundColor: corDoAvatar(r.id) }}
    >
      {inicialDoNome(r.titulo)}
    </span>
  );
}

/**
 * O detalhe aberto (`34a`, `34b`): a origem e, embaixo, "Sem empresa" (não temos
 * empresa: Fase 2) com o telefone à direita. O link `tel:` leva a dica "Ligar".
 */
function DetalheDoRecente({ r, id }: { r: NegocioRecente; id: string }) {
  const t = useT();
  return (
    <div id={id} className="mx-1 rounded-[6px] bg-surface px-0.5 py-1">
      <p className="flex h-[27px] items-center pl-[67px] text-[10.4px] font-normal text-casca-texto">
        <span className="truncate">{r.origem}</span>
      </p>
      <div className="flex h-[27px] items-center gap-1.5 pr-3 pl-3.5 text-[11px] font-bold text-casca-texto">
        <Building2 size={14} aria-hidden className="shrink-0 text-casca-marca" />
        <span className="min-w-0 truncate">{t("Sem empresa")}</span>
        {r.telefone ? (
          <DicaEscura texto={t("Ligar")}>
            <a
              href={`tel:${r.telefone}`}
              aria-label={t("Ligar")}
              className="ml-auto shrink-0 text-casca-marca"
            >
              <Phone size={12} aria-hidden />
            </a>
          </DicaEscura>
        ) : (
          <span
            role="img"
            aria-label={t("Sem telefone")}
            title={t("Sem telefone")}
            className="ml-auto shrink-0 text-casca-meta"
          >
            <Phone size={12} aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Uma linha de 39px (`11a`, `11b`): a foto, o nome, e no hover o alfinete e a
 * seta. O fixado mostra o alfinete sempre, na cor da marca; no hover ele vira o
 * "desafixar".
 */
function LinhaDoRecente({
  r,
  fixado,
  aberto,
  onAbrir,
  onDetalhe,
  onFixo,
}: {
  r: NegocioRecente;
  fixado: boolean;
  aberto: boolean;
  onAbrir: () => void;
  onDetalhe: () => void;
  onFixo: () => void;
}) {
  const t = useT();
  const rotuloDoFixo = fixado ? t("Desafixar") : t("Fixar");
  const rotuloDoDetalhe = aberto ? t("Esconder detalhes") : t("Ver detalhes");
  const idDoDetalhe = `detalhe-do-recente-${r.id}`;
  return (
    <li>
      <div
        className={cn(
          "group/recente mx-1 rounded-[6px]",
          LINHA,
          "h-[39px]",
          LINHA_COM_HOVER,
          "pr-1",
        )}
      >
        <Link
          href={linkDoRecente(r)}
          onClick={onAbrir}
          className="flex h-full min-w-0 flex-1 items-center gap-[7px] pl-3"
        >
          <FotoDoRecente r={r} />
          <span className="min-w-0 truncate text-[11.7px] font-normal">{r.titulo}</span>
        </Link>
        {fixado && (
          <button
            type="button"
            aria-label={rotuloDoFixo}
            title={rotuloDoFixo}
            onClick={onFixo}
            className={cn(BOTAO_DE_ICONE, "text-casca-marca hover:text-casca-marca")}
          >
            <Pin
              size={12}
              aria-hidden
              className="group-focus-within/recente:hidden group-hover/recente:hidden"
            />
            <PinOff
              size={12}
              aria-hidden
              className="hidden group-focus-within/recente:block group-hover/recente:block"
            />
          </button>
        )}
        <span
          className={cn(SO_NO_HOVER, "group-hover/recente:opacity-100", aberto && "opacity-100")}
        >
          {!fixado && (
            <button
              type="button"
              aria-label={rotuloDoFixo}
              title={rotuloDoFixo}
              onClick={onFixo}
              className={ICONE_DA_LINHA}
            >
              <Pin size={12} aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-label={rotuloDoDetalhe}
            title={rotuloDoDetalhe}
            aria-expanded={aberto}
            aria-controls={aberto ? idDoDetalhe : undefined}
            onClick={onDetalhe}
            className={ICONE_DA_LINHA}
          >
            {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </button>
        </span>
      </div>
      {aberto && <DetalheDoRecente r={r} id={idDoDetalhe} />}
    </li>
  );
}

/**
 * A SEÇÃO RECENTES do painel Origens (fork Escale, Fase 1E; Clint superior,
 * `11a`, `11b`, `34a`, `34b`): os negócios fixados e, depois de uma divisória, os
 * abertos por último, 5 de cada vez com "Ver mais". Abre recolhida, como na Clint;
 * o chevron grava a preferência em cookie (`onAlternar`). Um detalhe aberto por vez.
 *
 * Os dados moram no `localStorage` e chegam por `useNegociosRecentes`
 * (`useSyncExternalStore`): o primeiro render é vazio, igual no servidor.
 */
export function SecaoRecentes({
  chave,
  aberta,
  onAlternar,
}: {
  chave: string;
  aberta: boolean;
  onAlternar: () => void;
}) {
  const t = useT();
  const { fixados, recentes, registrar, alternarFixo } = useNegociosRecentes(chave);
  const [verTodos, setVerTodos] = useState({ fixados: false, recentes: false });
  const [detalhe, setDetalhe] = useState<string | null>(null);

  function fixarOuDesafixar(id: string) {
    if (alternarFixo(id) === "limite") {
      toast.error(t("Você atingiu o limite. Desafixe algo pra fixar mais."));
    }
  }

  function bloco(lista: NegocioRecente[], nome: "fixados" | "recentes", ehFixado: boolean) {
    const mostrados = verTodos[nome] ? lista : lista.slice(0, VISIVEIS);
    return (
      <>
        <ul>
          {mostrados.map((r) => (
            <LinhaDoRecente
              key={r.id}
              r={r}
              fixado={ehFixado}
              aberto={detalhe === r.id}
              onAbrir={() => registrar(r)}
              onDetalhe={() => setDetalhe((atual) => (atual === r.id ? null : r.id))}
              onFixo={() => fixarOuDesafixar(r.id)}
            />
          ))}
        </ul>
        {lista.length > VISIVEIS && (
          <button
            type="button"
            onClick={() => setVerTodos((v) => ({ ...v, [nome]: !v[nome] }))}
            className="flex h-7 w-full items-center pl-4 text-left text-[11px] text-casca-marca hover:underline"
          >
            {verTodos[nome] ? t("Ver menos") : t("Ver mais")}
          </button>
        )}
      </>
    );
  }

  const vazio = fixados.length === 0 && recentes.length === 0;
  return (
    <TooltipProvider delayDuration={300}>
      <section aria-label={t("Recentes")}>
        <CabecalhoDaSecao icone={<Clock size={16} />} titulo={t("Recentes")}>
          <button
            type="button"
            aria-label={aberta ? t("Recolher os recentes") : t("Abrir os recentes")}
            aria-expanded={aberta}
            onClick={onAlternar}
            className={cn(BOTAO_DE_ICONE, "text-casca-meta")}
          >
            {aberta ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </CabecalhoDaSecao>
        {aberta && vazio && (
          <p className="flex h-[34px] items-center pr-3 pl-4 text-[11px] text-casca-suave">
            {t("Você não possui negócios recém trabalhados.")}
          </p>
        )}
        {aberta && fixados.length > 0 && bloco(fixados, "fixados", true)}
        {aberta && fixados.length > 0 && recentes.length > 0 && (
          <hr role="separator" className="m-0 border-t border-casca-borda" />
        )}
        {aberta && recentes.length > 0 && bloco(recentes, "recentes", false)}
      </section>
    </TooltipProvider>
  );
}
