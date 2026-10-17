"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CHAVE_DOS_VAZIOS,
  filtrarCampos,
  lerOcultarVazios,
  valorParaLeitura,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import { ChevronDown, Search, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { EditorDeCampo } from "./EditorDeCampo";

/**
 * A MOLDURA "CAMPOS DE …" DA CLINT (fork Escale, Fases 1G e 1H; prints 02 a 04).
 *
 * Um grupo só ("Informações Gerais"; os grupos são da Fase 2, N3). A faixa tem
 * "Ocultar/Mostrar vazios" (por tipo, no localStorage; a flag da Clint é
 * invertida: o padrão é mostrar tudo) e "Gerenciar campos" (link para a tela de
 * campos, só para quem administra). A busca filtra pelo rótulo. Com `aoSalvar`,
 * cada linha é o `EditorDeCampo`; sem ele (Empresa), a caixa é só leitura.
 */
export type TipoDaMoldura = "contato" | "empresa" | "negocio";

const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";
const BOTAO_DA_FAIXA = "border border-casca-borda bg-surface";
export const ROTA_DE_GERENCIAR_CAMPOS = "/app/settings/tenant/pipelines";

export function CamposDaFicha({
  icone,
  titulo,
  tipo,
  campos,
  aoSalvar,
  moeda,
  gerenciarHref,
}: {
  icone: ReactNode;
  titulo: string;
  tipo: TipoDaMoldura;
  campos: CampoEditavel[];
  aoSalvar?: (chave: string, valor: unknown) => Promise<void>;
  moeda?: string;
  /** O link de "Gerenciar campos"; `null` = desligado (sem permissão); `undefined` = "Em breve" (Empresa). */
  gerenciarHref?: string | null;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [ocultarVazios, setOcultarVazios] = useState(() =>
    lerOcultarVazios(typeof window === "undefined" ? null : window.localStorage, tipo),
  );
  const visiveis = useMemo(
    () => filtrarCampos(campos, busca, ocultarVazios),
    [campos, busca, ocultarVazios],
  );

  function alternarVazios() {
    const proximo = !ocultarVazios;
    setOcultarVazios(proximo);
    try {
      window.localStorage.setItem(CHAVE_DOS_VAZIOS(tipo), proximo ? "1" : "0");
    } catch {
      // Sem localStorage (modo privado): a escolha vale só nesta abertura.
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="flex h-[46px] items-center justify-between rounded-lg bg-casca-raia px-5">
        <h2 className="flex items-center gap-2 text-[15px] text-casca-texto">
          <span aria-hidden className="text-casca-marca">
            {icone}
          </span>
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            title={t("Alternar exibição de campos sem valor preenchido")}
            className={BOTAO_DA_FAIXA}
            onClick={alternarVazios}
          >
            {ocultarVazios ? t("Mostrar vazios") : t("Ocultar vazios")}
          </BotaoDaCasca>
          {gerenciarHref ? (
            <Link
              href={gerenciarHref}
              title={t("Configure quais campos aparecem e em que ordem")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-casca-gatilho px-2 text-xs font-medium text-casca-texto-2 hover:bg-casca-raia [&_svg]:size-3.5",
                BOTAO_DA_FAIXA,
              )}
            >
              <Settings aria-hidden />
              {t("Gerenciar campos")}
            </Link>
          ) : (
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              disabled
              title={
                gerenciarHref === null
                  ? t("Só quem administra a conta gerencia os campos.")
                  : t("Em breve")
              }
              className={cn(BOTAO_DA_FAIXA, EM_BREVE)}
            >
              <Settings aria-hidden />
              {t("Gerenciar campos")}
            </BotaoDaCasca>
          )}
        </div>
      </div>
      <div className="mt-4 flex rounded-lg border border-casca-borda">
        <nav
          aria-label={t("Grupos de campos")}
          className="w-[238px] shrink-0 border-r border-casca-borda p-2"
        >
          <span
            aria-current="true"
            className="flex h-9 items-center rounded-md border-l-2 border-casca-marca bg-casca-raia px-3 text-[13px] font-semibold text-casca-texto"
          >
            {t("Informações Gerais")}
          </span>
        </nav>
        <div className="min-w-0 flex-1">
          <div className="border-b border-casca-borda p-4">
            <span className="relative inline-block">
              <input
                type="search"
                aria-label={t("Pesquisar campos...")}
                placeholder={t("Pesquisar campos...")}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 w-[166px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
              />
              <Search
                size={14}
                aria-hidden
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
              />
            </span>
          </div>
          {visiveis.length === 0 ? (
            <p className="px-9 py-6 text-[13px] text-casca-suave">{t("Nenhum campo encontrado")}</p>
          ) : (
            <dl className="px-9 py-4">
              {visiveis.map((c) => (
                <div
                  key={c.chave}
                  className="grid grid-cols-[275px_1fr] items-center border-b border-casca-borda py-2 last:border-b-0"
                >
                  <dt className="text-[13px] font-medium text-casca-texto">
                    {c.rotulo}
                    {c.obrigatorioNaEtapa ? (
                      <span className="ml-1 text-[11px] text-destructive">
                        {t("Campo obrigatório nesta etapa")}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="[&_[role=combobox]]:h-8">
                    {aoSalvar ? (
                      <EditorDeCampo
                        campo={c}
                        moeda={moeda}
                        aoSalvar={(valor) => aoSalvar(c.chave, valor)}
                      />
                    ) : (
                      <CaixaSoLeitura campo={c} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {ocultarVazios ? (
            <p className="px-9 pb-4">
              <span
                className="cursor-help text-[12px] text-casca-marca"
                title={t(
                  'Os campos vazios estão sendo ocultados. Você pode clicar no canto superior direito dessa aba para "Mostrar campos vazios".',
                )}
              >
                {t("Porque não vejo alguns campos?")}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A caixa da 1G (só leitura), usada onde ainda não se edita (Empresa, Q2). */
function CaixaSoLeitura({ campo }: { campo: CampoEditavel }) {
  const t = useT();
  const texto = valorParaLeitura(campo.tipo, campo.opcoes, campo.valor, t);
  const lista = campo.tipo === "select" || campo.tipo === "multiselect";
  return (
    <div
      title={texto ? undefined : t("Em breve")}
      className={cn(
        "flex h-8 items-center justify-between rounded-md bg-casca-busca px-3 text-[13px]",
        texto ? "text-casca-texto" : "text-casca-meta",
      )}
    >
      <span className="truncate">{texto ?? t("Clique aqui para adicionar")}</span>
      {lista ? <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" /> : null}
    </div>
  );
}
