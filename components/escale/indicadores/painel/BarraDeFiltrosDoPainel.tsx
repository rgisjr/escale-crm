"use client";
import { useState } from "react";
import { toast } from "sonner";

import { BalaoDoFiltro } from "@/components/escale/contatos/filtros/BalaoDoFiltro";
import { ControleDosFiltros } from "@/components/escale/contatos/filtros/ControleDosFiltros";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover } from "@/components/ui/popover";
import {
  useCriarFiltroDaLista,
  useExcluirFiltroDaLista,
  useFiltrosDaLista,
  useMudarFiltroDaLista,
} from "@/hooks/escale/useFiltrosDaLista";
import type { usePreferenciasDoPainel } from "@/hooks/escale/usePreferenciasDoPainel";
import { useT } from "@/hooks/i18n/useT";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  FILTRO_PADRAO,
  contarFiltros,
  mesmosFiltrosDoPainel,
  type SecaoDoPainel,
} from "@/lib/escale/indicadores/painel/filtro";
import { Bookmark } from "@/lib/ui/icons-da-casca";

import { FaixaDoPainel } from "./FaixaDoPainel";
import { PainelDeFiltrosDoPainel } from "./PainelDeFiltrosDoPainel";
import { SeletorDeFiltrosDoPainel } from "./SeletorDeFiltrosDoPainel";

const mensagemDoErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

/**
 * A BARRA DE FILTROS DO PAINEL (prints 10-006, 10-024): o seletor de filtro salvo, o "Filtros (N)" com o
 * popover e, com a faixa aberta, a faixa de chips. Os filtros salvos vão para `crm_filtros_das_listas`
 * (lista `paineis`), valendo para todos os painéis da pessoa (R2).
 */
export function BarraDeFiltrosDoPainel({
  prefs,
  opcoes,
}: {
  prefs: ReturnType<typeof usePreferenciasDoPainel>;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const { filtro, filtroSalvoId, faixaAberta, mudarFiltro, aplicarSalvo, aplicarPadrao, alternarFaixa } = prefs;
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState<SecaoDoPainel | null>(null);
  const salvos = useFiltrosDaLista("paineis");
  const criar = useCriarFiltroDaLista("paineis");
  const mudar = useMudarFiltroDaLista("paineis");
  const excluir = useExcluirFiltroDaLista("paineis");
  const falhou = t("Não consegui completar essa ação. Tente de novo.");
  const quantos = contarFiltros(filtro);
  const difereDoPadrao = !mesmosFiltrosDoPainel(filtro, FILTRO_PADRAO);
  const aplicado = (salvos.data ?? []).find((s) => s.id === filtroSalvoId);
  const batendoComSalvo = aplicado ? mesmosFiltrosDoPainel(aplicado.criterios, filtro) : false;

  const abrir = (s: SecaoDoPainel | null) => {
    setFoco(s);
    setAberto(true);
  };

  async function salvarFiltro(nome: string, compartilhado: boolean): Promise<string | null> {
    try {
      const r = await criar.mutateAsync({ nome, compartilhado, criterios: filtro });
      aplicarSalvo(r.id, filtro);
      return null;
    } catch (e) {
      return mensagemDoErro(e, falhou);
    }
  }

  const rodape = (
    <div className="flex h-[44px] shrink-0 items-center justify-end gap-2 border-t border-casca-borda px-4">
      {difereDoPadrao && !batendoComSalvo ? (
        <BalaoDoFiltro
          aoSalvar={salvarFiltro}
          gatilho={
            <BotaoDaCasca type="button" variante="texto" tamanho="sm">
              <Bookmark size={14} aria-hidden />
              {t("Salvar filtro")}
            </BotaoDaCasca>
          }
        />
      ) : null}
      {difereDoPadrao ? (
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={aplicarPadrao}>
          {t("Resetar")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-casca-divisoria px-6">
        <SeletorDeFiltrosDoPainel
          filtro={filtro}
          filtroSalvoId={filtroSalvoId}
          salvos={salvos.data ?? []}
          aoAplicarPadrao={aplicarPadrao}
          aoAplicarSalvo={(s) => aplicarSalvo(s.id, s.criterios)}
          aoCriarFiltro={() => abrir(null)}
          aoSalvarComoNovo={salvarFiltro}
          aoRenomear={async (id, nome) => {
            try {
              await mudar.mutateAsync({ id, nome });
              return null;
            } catch (e) {
              return mensagemDoErro(e, falhou);
            }
          }}
          aoCompartilhar={(id, compartilhado) =>
            mudar.mutate({ id, compartilhado }, { onError: (e) => toast.error(mensagemDoErro(e, falhou)) })
          }
          aoExcluir={(id) =>
            excluir.mutate(id, {
              onSuccess: () => {
                if (id === filtroSalvoId) aplicarPadrao();
              },
              onError: (e) => toast.error(mensagemDoErro(e, falhou)),
            })
          }
        />
        <Popover
          open={aberto}
          onOpenChange={(a) => {
            setAberto(a);
            if (!a) setFoco(null);
          }}
        >
          <ControleDosFiltros variante="painel" faixaAberta={faixaAberta} quantos={quantos} aoAlternarFaixa={alternarFaixa} />
          <PainelSuspenso align="start" sideOffset={8} className="w-auto p-0">
            <PainelDeFiltrosDoPainel
              filtro={filtro}
              aoMudar={mudarFiltro}
              opcoes={opcoes}
              foco={foco}
              aoMudarFoco={setFoco}
              rodape={rodape}
            />
          </PainelSuspenso>
        </Popover>
      </div>
      {faixaAberta ? (
        <FaixaDoPainel
          filtro={filtro}
          opcoes={opcoes}
          aoMudar={mudarFiltro}
          aoAbrir={abrir}
          podeResetar={difereDoPadrao}
          aoResetar={aplicarPadrao}
          aoRecolher={alternarFaixa}
        />
      ) : null}
    </>
  );
}
