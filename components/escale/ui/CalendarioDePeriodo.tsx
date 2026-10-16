"use client";
import { addDays, format } from "date-fns";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { useLocaleDeData } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  dataDoIso,
  dentroDoIntervalo,
  diasDoMes,
  formatarDataBr,
  isoDaData,
  mesVizinho,
  ordenarIntervalo,
  periodoDoAtalho,
  type AtalhoDePeriodo,
} from "@/lib/escale/ui/periodos";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O CALENDÁRIO DE PERÍODO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * O "Data" da Clint (menu superior), medido no print do usuário de 15/10:
 * coluna de 184px com as 4 abas de tipo (criação, ganho, perda, agendada) e
 * os atalhos (Hoje … Esse ano); ao lado, dois meses com a semana começando
 * no domingo. O intervalo se escolhe com dois cliques, em qualquer ordem.
 * Na tela, toda data é dd/mm/aaaa.
 *
 * Os números dos dias e a seleção usam a cor da marca da organização no
 * lugar do roxo da Clint. Os nomes das abas e o visual do intervalo
 * selecionado da variante superior ainda não têm print (nº 24 do plano-índice).
 *
 * As 4 abas aparecem sempre. As que não estão em `tiposDisponiveis` ficam
 * desligadas, com a dica "Em breve", e as setas pulam por cima delas.
 */
export type TipoDeData = "criacao" | "ganho" | "perda" | "agendado";
export type Periodo = { tipo: TipoDeData; de?: string; ate?: string };
export type CalendarioDePeriodoProps = {
  valor: Periodo;
  aoMudar: (p: Periodo) => void;
  tiposDisponiveis?: TipoDeData[];
};

const TIPOS_DE_DATA: readonly TipoDeData[] = ["criacao", "ganho", "perda", "agendado"];

const ROTULO_DO_TIPO = {
  criacao: "Data de criação",
  ganho: "Data de ganho",
  perda: "Data de perda",
  agendado: "Data agendada",
} as const satisfies Record<TipoDeData, string>;

const ICONE_DO_TIPO: Record<TipoDeData, LucideIcon> = {
  criacao: CalendarPlus,
  ganho: CalendarCheck,
  perda: CalendarX,
  agendado: CalendarClock,
};

const ROTULO_DO_ATALHO = {
  hoje: "Hoje",
  ontem: "Ontem",
  "essa-semana": "Essa semana",
  "semana-passada": "Semana passada",
  "esse-mes": "Esse mês",
  "mes-passado": "Mês passado",
  "esse-ano": "Esse ano",
} as const satisfies Record<AtalhoDePeriodo, string>;

const DIA_DA_SEMANA = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
} as const;
const ORDEM_DOS_DIAS = [0, 1, 2, 3, 4, 5, 6] as const;

const PASSO_DA_TECLA: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const FOCO = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca";

type Mes = { ano: number; mes0: number };

function mesDe(data: Date): Mes {
  return { ano: data.getFullYear(), mes0: data.getMonth() };
}

type GradeDoMesProps = {
  mes: Mes;
  titulo: string;
  idBase: string;
  valor: Periodo;
  focado: string | undefined;
  diasDaSemana: readonly string[];
  navegacao: ReactNode;
  ladoDaNavegacao: "esquerda" | "direita";
  aoEscolher: (iso: string) => void;
  aoTeclar: (e: KeyboardEvent<HTMLDivElement>) => void;
};

function GradeDoMes({
  mes,
  titulo,
  idBase,
  valor,
  focado,
  diasDaSemana,
  navegacao,
  ladoDaNavegacao,
  aoEscolher,
  aoTeclar,
}: GradeDoMesProps) {
  const idDoTitulo = `${idBase}-titulo-${mes.ano}-${mes.mes0}`;
  const vazio = <span aria-hidden className="size-6" />;
  return (
    <div role="group" aria-labelledby={idDoTitulo} className="w-[260px]">
      <div className="mb-4 flex h-7 items-center justify-between">
        {ladoDaNavegacao === "esquerda" ? navegacao : vazio}
        <p id={idDoTitulo} className="text-sm font-medium text-casca-texto">
          {titulo}
        </p>
        {ladoDaNavegacao === "direita" ? navegacao : vazio}
      </div>
      <div aria-hidden className="mb-3 grid grid-cols-7 gap-x-1.5">
        {diasDaSemana.map((dia) => (
          <span key={dia} className="text-center text-[0.7rem] font-semibold uppercase text-casca-texto">
            {dia}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-1.5 gap-y-[7px]" onKeyDown={aoTeclar}>
        {diasDoMes(mes.ano, mes.mes0).map((d) => {
          const extremo = d.iso === valor.de || d.iso === valor.ate;
          const noMeio = dentroDoIntervalo(d.iso, valor.de, valor.ate);
          return (
            <button
              key={d.iso}
              id={d.doMes ? `${idBase}-dia-${d.iso}` : undefined}
              type="button"
              tabIndex={d.doMes && d.iso === focado ? 0 : -1}
              aria-label={formatarDataBr(d.iso)}
              aria-pressed={extremo}
              data-no-intervalo={noMeio ? "" : undefined}
              data-fora-do-mes={d.doMes ? undefined : ""}
              onClick={() => aoEscolher(d.iso)}
              className={cn(
                "h-[30px] w-8 rounded-[6px] text-[0.8rem] font-medium transition-colors duration-fast ease-out",
                FOCO,
                extremo
                  ? "bg-casca-marca text-accent-foreground"
                  : noMeio
                    ? "bg-casca-marca-suave text-casca-marca"
                    : "bg-casca-dia text-casca-marca hover:bg-casca-marca-suave",
              )}
            >
              {Number(d.iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarioDePeriodo({ valor, aoMudar, tiposDisponiveis = [...TIPOS_DE_DATA] }: CalendarioDePeriodoProps) {
  const t = useT();
  const locale = useLocaleDeData();
  const idBase = useId();
  const [hoje] = useState(() => new Date());
  const [primeiro, setPrimeiro] = useState<Mes>(() => mesDe(valor.de ? dataDoIso(valor.de) : new Date()));
  const [foco, setFoco] = useState<string | null>(null);
  const segundo = mesVizinho(primeiro.ano, primeiro.mes0, 1);

  const visiveis = [...diasDoMes(primeiro.ano, primeiro.mes0), ...diasDoMes(segundo.ano, segundo.mes0)]
    .filter((d) => d.doMes)
    .map((d) => d.iso);
  const focado = [foco, valor.de].find((iso): iso is string => !!iso && visiveis.includes(iso)) ?? visiveis[0];
  const atalhoAtivo = valor.de && valor.ate ? atalhoDoPeriodo(valor.de, valor.ate, hoje) : null;
  const diasDaSemana = ORDEM_DOS_DIAS.map((i) => t(DIA_DA_SEMANA[i]));
  const titulo = (mes: Mes) => format(new Date(mes.ano, mes.mes0, 1), "LLLL yyyy", { locale });
  const resumo =
    valor.de && valor.ate
      ? t("De {de} a {ate}").replace("{de}", formatarDataBr(valor.de)).replace("{ate}", formatarDataBr(valor.ate))
      : valor.de
        ? t("A partir de {de}").replace("{de}", formatarDataBr(valor.de))
        : "";

  function escolherTipo(tipo: TipoDeData) {
    if (tipo !== valor.tipo) aoMudar({ ...valor, tipo });
  }

  function escolherAtalho(atalho: AtalhoDePeriodo) {
    const periodo = periodoDoAtalho(atalho, hoje);
    setPrimeiro(mesDe(dataDoIso(periodo.de)));
    setFoco(periodo.de);
    aoMudar({ tipo: valor.tipo, ...periodo });
  }

  function escolherDia(iso: string) {
    setFoco(iso);
    if (valor.de && !valor.ate) {
      aoMudar({ tipo: valor.tipo, ...ordenarIntervalo(valor.de, iso) });
      return;
    }
    aoMudar({ tipo: valor.tipo, de: iso });
  }

  function navegar(passo: 1 | -1) {
    setPrimeiro((mes) => mesVizinho(mes.ano, mes.mes0, passo));
  }

  function teclaNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (passo === 0) return;
    e.preventDefault();
    const total = tiposDisponiveis.length;
    const atual = tiposDisponiveis.indexOf(valor.tipo);
    const proximo = tiposDisponiveis[(atual + passo + total) % total];
    if (!proximo) return;
    escolherTipo(proximo);
    document.getElementById(`${idBase}-aba-${proximo}`)?.focus();
  }

  function teclaNosDias(e: KeyboardEvent<HTMLDivElement>) {
    const passo = PASSO_DA_TECLA[e.key];
    if (passo === undefined || !focado) return;
    e.preventDefault();
    const alvo = isoDaData(addDays(dataDoIso(focado), passo));
    if (!visiveis.includes(alvo)) return;
    setFoco(alvo);
    document.getElementById(`${idBase}-dia-${alvo}`)?.focus();
  }

  const seta = (passo: 1 | -1) => (
    <button
      type="button"
      onClick={() => navegar(passo)}
      aria-label={passo === -1 ? t("Mês anterior") : t("Próximo mês")}
      className={cn(
        "grid size-6 place-items-center rounded-[6px] text-casca-seta transition-colors duration-fast ease-out hover:text-casca-suave",
        FOCO,
      )}
    >
      {passo === -1 ? <ChevronLeft aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
    </button>
  );

  return (
    <div data-calendario-de-periodo="" className="flex w-[742px] max-w-full text-casca-texto">
      <div className="flex w-[184px] shrink-0 flex-col border-r border-casca-borda">
        <div
          role="tablist"
          aria-label={t("Tipo de data")}
          onKeyDown={teclaNasAbas}
          className="flex gap-2 border-b border-casca-divisoria p-3"
        >
          {TIPOS_DE_DATA.map((tipo, i) => {
            const Icone = ICONE_DO_TIPO[tipo];
            const ativo = tipo === valor.tipo;
            // As 4 abas ficam sempre no lugar (print); a que não vale ainda fica desligada.
            const disponivel = tiposDisponiveis.includes(tipo);
            return (
              <button
                key={tipo}
                id={`${idBase}-aba-${tipo}`}
                type="button"
                role="tab"
                aria-selected={ativo}
                tabIndex={ativo ? 0 : -1}
                disabled={!disponivel}
                aria-label={t(ROTULO_DO_TIPO[tipo])}
                title={disponivel ? t(ROTULO_DO_TIPO[tipo]) : t("Em breve")}
                onClick={() => escolherTipo(tipo)}
                className={cn(
                  "grid h-[23px] w-[34px] place-items-center transition-colors duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-40",
                  FOCO,
                  i === 0 && "rounded-l-[5px]",
                  i === TIPOS_DE_DATA.length - 1 && "rounded-r-[5px]",
                  ativo ? "bg-casca-texto-2 text-surface" : "bg-casca-raia text-casca-texto-2",
                )}
              >
                <Icone aria-hidden className="size-3.5" />
              </button>
            );
          })}
        </div>
        <ul aria-label={t("Atalhos de período")} className="flex flex-col">
          {ATALHOS_DE_PERIODO.map((atalho) => (
            <li key={atalho} className="border-b border-casca-divisoria last:border-b-0">
              <button
                type="button"
                aria-pressed={atalhoAtivo === atalho}
                onClick={() => escolherAtalho(atalho)}
                className={cn(
                  "flex h-[42px] w-full items-center pl-3 text-left text-[0.7rem] font-medium transition-colors duration-fast ease-out hover:text-casca-novo focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-casca-marca",
                  atalhoAtivo === atalho ? "text-casca-novo" : "text-casca-texto-2",
                )}
              >
                {t(ROTULO_DO_ATALHO[atalho])}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-[18px] px-2.5 py-4">
        <GradeDoMes
          mes={primeiro}
          titulo={titulo(primeiro)}
          idBase={idBase}
          valor={valor}
          focado={focado}
          diasDaSemana={diasDaSemana}
          navegacao={seta(-1)}
          ladoDaNavegacao="esquerda"
          aoEscolher={escolherDia}
          aoTeclar={teclaNosDias}
        />
        <GradeDoMes
          mes={segundo}
          titulo={titulo(segundo)}
          idBase={idBase}
          valor={valor}
          focado={focado}
          diasDaSemana={diasDaSemana}
          navegacao={seta(1)}
          ladoDaNavegacao="direita"
          aoEscolher={escolherDia}
          aoTeclar={teclaNosDias}
        />
      </div>
      <p role="status" className="sr-only">
        {resumo}
      </p>
    </div>
  );
}
