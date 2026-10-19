"use client";

import * as Popover from "@radix-ui/react-popover";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CabecaDaJanela, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import { copyToClipboard } from "@/lib/clipboard";
import { useCatalogoDeCampos, useMudarCatalogo } from "@/hooks/escale/useCatalogoDeCampos";
import { type CampoDoCatalogo, type GrupoDeCampos, OBJETOS_DE_CAMPO, type ObjetoDeCampo, ROTULO_DO_OBJETO, variavelDoCampo } from "@/lib/escale/campos/regras";
import { Search } from "@/lib/ui/icons-da-casca";

import { BalaoDeVisibilidade } from "./BalaoDeVisibilidade";
import { FormularioDeCampo } from "./FormularioDeCampo";
import { FormularioDeGrupo } from "./FormularioDeGrupo";
import { GruposDoCatalogo } from "./GruposDoCatalogo";
import { ListaDeCampos } from "./ListaDeCampos";

export interface JanelaDeGerenciarCamposProps {
  aberta: boolean;
  aoFechar: () => void;
  objetoInicial: ObjetoDeCampo;
}

/**
 * "Gerenciamento de campos" da Clint (FieldsConfigTab como modal): abas por
 * objeto, grupos à esquerda, a lista do grupo à direita, "Adicionar grupo" e
 * "Adicionar campo". Só administrador abre (quem chama já conferiu).
 */
export function JanelaDeGerenciarCampos({ aberta, aoFechar, objetoInicial }: JanelaDeGerenciarCamposProps) {
  const t = useT();
  const [objeto, setObjeto] = useState<ObjetoDeCampo>(objetoInicial);
  const [grupoAtivoId, setGrupoAtivoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState<"campo" | "grupo" | null>(null);
  const [editando, setEditando] = useState<CampoDoCatalogo | null>(null);
  const [excluindo, setExcluindo] = useState<CampoDoCatalogo | null>(null);
  const [restringindo, setRestringindo] = useState<{ campo: CampoDoCatalogo; ancora: HTMLElement } | null>(null);
  const { catalogo, carregando, erro } = useCatalogoDeCampos(objeto, aberta);
  const mudar = useMudarCatalogo(objeto);

  useEffect(() => setObjeto(objetoInicial), [objetoInicial, aberta]);
  const grupoAtivo: GrupoDeCampos | null = useMemo(() => catalogo.grupos.find((g) => g.id === grupoAtivoId) ?? catalogo.grupos[0] ?? null, [catalogo.grupos, grupoAtivoId]);

  const copiar = async (texto: string, aviso: string) => {
    if (await copyToClipboard(texto)) toast.success(aviso);
    else toast.error(t("Ocorreu um erro ao salvar"));
  };

  const abas = OBJETOS_DE_CAMPO.map((o) => ({ valor: o, rotulo: t(ROTULO_DO_OBJETO[o]) }));

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(960px,100%)] h-[min(680px,92vh)]">
      <CabecaDaJanela titulo={t("Gerenciamento de campos")} descricao={t("Campos cadastrados")} />
      <div className="flex items-center justify-between gap-3 px-6">
        <AbasDaCasca abas={abas} valor={objeto} aoMudar={(v) => { setObjeto(v); setGrupoAtivoId(null); setBusca(""); }} aria-label={t("Objeto")} />
        <div className="flex items-center gap-2">
          <BotaoDaCasca variante="novo" tamanho="sm" onClick={() => setFormulario("grupo")}>{t("Adicionar grupo")}</BotaoDaCasca>
          <BotaoDaCasca variante="marca" tamanho="sm" onClick={() => setFormulario("campo")}>{t("Adicionar campo")}</BotaoDaCasca>
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 border-t border-casca-borda">
        <GruposDoCatalogo
          grupos={catalogo.grupos}
          ativo={grupoAtivo}
          aoEscolher={(g) => { setGrupoAtivoId(g.id); setBusca(""); }}
          aoRenomear={(g, nome) => mudar.renomearGrupo.mutate({ id: g.id, nome }, { onError: (e) => toast.error(e.message) })}
          aoExcluir={(g) => mudar.excluirGrupo.mutate(g.id, { onError: (e) => toast.error(e.message) })}
          aoReordenar={(ids) => mudar.reordenar.mutate({ objeto, grupos: ids, campos: [] }, { onError: (e) => toast.error(e.message) })}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <label className="relative m-3 block w-[220px]">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar coluna ou campo")}
              className="h-8 w-full rounded-[6px] bg-casca-busca pl-3 pr-8 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
            <Search size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-casca-meta" />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            {carregando && <p className="py-12 text-center text-[13px] text-casca-suave">{t("Carregando…")}</p>}
            {erro && <p className="py-12 text-center text-[13px] text-casca-suave">{t("Ocorreu um erro ao carregar os dados")}</p>}
            {!carregando && !erro && (
              <ListaDeCampos
                catalogo={catalogo}
                grupoAtivo={grupoAtivo}
                busca={busca}
                aoEditarNome={setEditando}
                aoRestringir={(campo, ancora) => setRestringindo({ campo, ancora })}
                aoCopiarVariavel={(c) => void copiar(variavelDoCampo(objeto, c.chave), t("Variável copiada!"))}
                aoCopiarIdentificador={(c) => void copiar(c.chave, t("Identificador copiado!"))}
                aoExcluir={setExcluindo}
                aoReordenar={(grupoId, ids) => mudar.reordenar.mutate({ objeto, grupos: catalogo.grupos.map((g) => g.id), campos: [{ grupo_id: grupoId, ids }] })}
              />
            )}
          </div>
        </div>
      </div>

      {formulario === "campo" && (
        <FormularioDeCampo
          objeto={objeto}
          catalogo={catalogo}
          grupoSugerido={grupoAtivo}
          aoFechar={() => setFormulario(null)}
          aoSalvar={(entrada) =>
            mudar.criarCampo.mutateAsync(entrada).then(() => { toast.success(t("As alterações foram salvas com sucesso!")); setFormulario(null); })
          }
          aoCriarGrupo={(nome) => mudar.criarGrupo.mutateAsync(nome).then((g) => g as GrupoDeCampos)}
        />
      )}
      {formulario === "grupo" && (
        <FormularioDeGrupo aoFechar={() => setFormulario(null)} aoSalvar={(nome) => mudar.criarGrupo.mutateAsync(nome).then(() => setFormulario(null))} />
      )}
      {editando && (
        <FormularioDeCampo
          objeto={objeto}
          catalogo={catalogo}
          grupoSugerido={grupoAtivo}
          campo={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(entrada) =>
            mudar.mudarCampo.mutateAsync({ id: editando.id, patch: { nome: entrada.nome, grupo_id: entrada.grupo_id, opcoes: entrada.opcoes } }).then(() => setEditando(null))
          }
          aoCriarGrupo={(nome) => mudar.criarGrupo.mutateAsync(nome).then((g) => g as GrupoDeCampos)}
        />
      )}
      <JanelaDeConfirmacao
        aberta={Boolean(excluindo)}
        aoFechar={() => setExcluindo(null)}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        ocupado={mudar.excluirCampo.isPending}
        aoConfirmar={() => excluindo && mudar.excluirCampo.mutate(excluindo.id, { onSuccess: () => setExcluindo(null), onError: (e) => toast.error(e.message) })}
      >
        <p className="text-[13px] text-casca-texto">{t("A exclusão desse campo remove em toda origem. Deseja continuar?")}</p>
        <p className="mt-2 text-[12px] text-casca-suave">{t("Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.")}</p>
      </JanelaDeConfirmacao>
      {restringindo && (
        <Popover.Root open onOpenChange={(o) => !o && setRestringindo(null)}>
          <Popover.Anchor virtualRef={{ current: restringindo.ancora }} />
          <PainelSuspenso align="end">
            <BalaoDeVisibilidade
              campo={restringindo.campo}
              aoMudar={(papel) => mudar.mudarCampo.mutate({ id: restringindo.campo.id, patch: { papel_minimo: papel } }, { onSuccess: () => setRestringindo(null), onError: (e) => toast.error(e.message) })}
            />
          </PainelSuspenso>
        </Popover.Root>
      )}
    </JanelaDaCasca>
  );
}
