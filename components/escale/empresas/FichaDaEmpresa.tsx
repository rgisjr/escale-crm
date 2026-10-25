"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  ErroDaApiDaEmpresa,
  useContatosDaEmpresa,
  useEmpresa,
  useMudarEmpresa,
  useNegociosDaEmpresa,
} from "@/hooks/escale/useEmpresa";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import { ArrowLeft, MoreVertical } from "@/lib/ui/icons-da-casca";

import { AbaContatosDaEmpresa } from "./AbaContatosDaEmpresa";
import { AbaDadosDaEmpresa } from "./AbaDadosDaEmpresa";
import { AbaNegociosDaEmpresa } from "./AbaNegociosDaEmpresa";
import { Monograma } from "./Monograma";

/** Carregando ou com erro, a aba mostra esqueleto ou erro com "Tentar de novo", não uma lista vazia. */
function EstadoDaAba({
  consulta,
  mensagemDeErro,
  children,
}: {
  consulta: { isLoading: boolean; isError: boolean; refetch: () => unknown };
  mensagemDeErro: string;
  children: ReactNode;
}) {
  const t = useT();
  if (consulta.isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-[14px] text-casca-texto">{mensagemDeErro}</p>
        <BotaoDaCasca type="button" variante="novo" onClick={() => void consulta.refetch()}>
          {t("Tentar de novo")}
        </BotaoDaCasca>
      </div>
    );
  }
  if (consulta.isLoading) {
    return (
      <div className="flex flex-col gap-2 px-[30px] py-4" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-casca-raia" />
        ))}
      </div>
    );
  }
  return <>{children}</>;
}

type Aba = "contatos" | "negocios" | "dados";
const ABAS: readonly Aba[] = ["contatos", "negocios", "dados"];
const ROTULO_DA_ABA: Record<Aba, string> = { contatos: "Contatos", negocios: "Negócios", dados: "Dados" };

function Bloco({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-casca-meta uppercase">{rotulo}</span>
      {children}
    </div>
  );
}

/**
 * A FICHA DA EMPRESA (Clint `index-BYxUbJr8`; fork Escale, Fase 2D): o topo com o
 * monograma e o ⋮, o resumo (Valor em aberto, Contato principal, Criada em) e as
 * abas Contatos, Negócios e Dados. A aba mora em `?aba=` e troca sem ir ao servidor.
 */
export function FichaDaEmpresa({
  id,
  papel,
  podeAdministrar,
}: {
  id: string;
  papel: Role;
  podeAdministrar: boolean;
}) {
  const t = useT();
  const tagDoIdioma = useTagDeIdioma();
  const router = useRouter();
  const params = useSearchParams();
  const pedida = params.get("aba");
  const [aba, setAba] = useState<Aba>(ABAS.includes(pedida as Aba) ? (pedida as Aba) : "contatos");
  const [excluindo, setExcluindo] = useState(false);
  const empresa = useEmpresa(id);
  const contatos = useContatosDaEmpresa(id);
  const negocios = useNegociosDaEmpresa(id, aba === "negocios");
  const { excluir } = useMudarEmpresa(id);

  const podeEditar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;

  const trocarAba = (nova: Aba) => {
    setAba(nova);
    // Troca só a URL, sem ir ao servidor (como a ficha do negócio, 1G).
    window.history.replaceState(null, "", `?aba=${nova}`);
  };

  async function excluirEmpresa() {
    try {
      await excluir.mutateAsync();
      toast.success(t("Empresa removida."));
      router.push("/app/companies");
    } catch {
      toast.error(t("Não foi possível excluir a empresa. Tente novamente."));
    }
  }

  if (empresa.isLoading) {
    return (
      <div className="px-[30px] py-6" aria-busy>
        <div className="h-9 w-72 animate-pulse rounded-md bg-casca-raia" />
        <div className="mt-6 h-16 animate-pulse rounded-md bg-casca-raia" />
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-casca-raia" />
          ))}
        </div>
      </div>
    );
  }
  if (empresa.error instanceof ErroDaApiDaEmpresa && empresa.error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
        <p className="text-[16px] font-medium text-casca-texto">{t("Empresa não encontrada")}</p>
        <p className="text-[13px] text-casca-suave">
          {t("Ela pode ter sido excluída ou você não tem acesso a ela.")}
        </p>
        <Link href="/app/companies" className="text-[13px] font-medium text-casca-marca hover:underline">
          {t("Empresas")}
        </Link>
      </div>
    );
  }
  if (empresa.isError || !empresa.data) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-[14px] text-casca-texto">{t("Não foi possível carregar a empresa.")}</p>
        <BotaoDaCasca type="button" variante="novo" onClick={() => void empresa.refetch()}>
          {t("Tentar de novo")}
        </BotaoDaCasca>
      </div>
    );
  }
  const e = empresa.data;
  const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: e.moeda }).format(e.valor_aberto);

  return (
    <div className="flex flex-col bg-surface">
      <div className="flex h-[58px] shrink-0 items-center gap-3 px-[30px]">
        <Link
          href="/app/companies"
          className="inline-flex items-center gap-1 text-[13px] text-casca-suave hover:text-casca-texto"
        >
          <ArrowLeft size={14} aria-hidden />
          {t("Empresas")}
        </Link>
        <Monograma nome={e.nome} tamanho={36} />
        <h1 className="min-w-0 truncate text-[18px] font-medium text-casca-texto">{e.nome}</h1>
        {podeExcluir ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={t("Ações da empresa")}
                className="ml-auto rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia"
              >
                <MoreVertical size={18} aria-hidden />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[70] w-[200px] rounded-[8px] border border-casca-borda bg-casca-superficie p-1 shadow-casca"
              >
                <DropdownMenu.Item
                  onSelect={() => setExcluindo(true)}
                  className="flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] text-casca-alerta outline-hidden data-[highlighted]:bg-casca-raia"
                >
                  {t("Excluir empresa")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : null}
      </div>

      <div
        data-testid="resumo-da-empresa"
        className="mx-[30px] grid grid-cols-3 gap-6 rounded-lg border border-casca-borda px-6 py-4"
      >
        <Bloco rotulo={t("Valor em aberto")}>
          <span className="text-[24px] leading-8 font-semibold text-casca-texto">{dinheiro}</span>
        </Bloco>
        <Bloco rotulo={t("Contato principal")}>
          {e.principal ? (
            <span className="flex items-center gap-2">
              <FotoDaLinha id={e.principal.id} nome={e.principal.nome} temFoto={e.principal.tem_foto} />
              <span className="truncate text-[14px] font-medium text-casca-texto">{e.principal.nome}</span>
            </span>
          ) : (
            <span className="text-[14px] text-casca-meta">—</span>
          )}
        </Bloco>
        <Bloco rotulo={t("Criada em")}>
          <span className="text-[14px] text-casca-texto">
            {new Intl.DateTimeFormat(tagDoIdioma).format(new Date(e.criada_em))}
          </span>
        </Bloco>
      </div>

      <div className="px-[30px] pt-5">
        <AbasDaCasca
          abas={ABAS.map((a) => ({ valor: a, rotulo: t(ROTULO_DA_ABA[a]) }))}
          valor={aba}
          aoMudar={trocarAba}
          aria-label={t("Seções da empresa")}
        />
      </div>

      {aba === "contatos" ? (
        <EstadoDaAba consulta={contatos} mensagemDeErro={t("Não foi possível carregar os contatos.")}>
          <AbaContatosDaEmpresa empresaId={id} contatos={contatos.data ?? []} podeEditar={podeEditar} />
        </EstadoDaAba>
      ) : aba === "negocios" ? (
        <EstadoDaAba consulta={negocios} mensagemDeErro={t("Não foi possível carregar os negócios.")}>
          <AbaNegociosDaEmpresa negocios={negocios.data ?? []} moeda={e.moeda} />
        </EstadoDaAba>
      ) : (
        <AbaDadosDaEmpresa
          empresa={e}
          podeEditar={podeEditar}
          podeAdministrar={podeAdministrar}
          podeConsultarCnpj={podeExcluir}
        />
      )}

      <JanelaDeConfirmacao
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        ocupado={excluir.isPending}
        aoConfirmar={() => void excluirEmpresa()}
      >
        <p>
          {t('Tem certeza que deseja excluir "{name}"? Os contatos serão mantidos.').replace("{name}", e.nome)}
        </p>
      </JanelaDeConfirmacao>
    </div>
  );
}
