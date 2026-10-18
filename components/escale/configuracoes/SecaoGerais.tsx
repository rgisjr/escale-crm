"use client";
import { useState } from "react";

import { Campo, CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BalaoDoNome } from "@/components/escale/ui/BalaoDoNome";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useCriarGrupo } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { VisibilityMode } from "@/lib/auth/types";
import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";
import { VISUALIZACOES } from "@/lib/escale/acesso/regras";
import { TAG_DO_SISTEMA, TAGS_PADRAO_MAX } from "@/lib/escale/configuracoes/tipos";
import type { Origens } from "@/lib/escale/origens/regras";
import { CirclePlus, Plus, Settings, X } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { SeletorDeMoeda } from "./SeletorDeMoeda";

/** CONFIGURAÇÕES GERAIS (Fase 1F, D2 a D4; Clint P01 a P06). Tudo vai para o rascunho; quem grava é o "Salvar" da janela. */
export function SecaoGerais({
  config,
  rascunho,
  mudar,
  origens,
  onOrigens,
}: PropsDaSecao & { origens: Origens; onOrigens: (o: Origens) => void }) {
  const t = useT();
  const org = useActiveOrg();
  const vocabulario = useContactTagVocabulary(org?.orgId ?? null);
  const criarGrupo = useCriarGrupo();
  const [erro, setErro] = useState<string | null>(null);
  const g = rascunho.gerais;
  const funil = origens.funis.find((f) => f.id === config.pipeline.id);
  const grupoAtual = funil?.group_id ?? config.pipeline.group_id;
  const grupos = origens.grupos.filter((x) => !x.is_archived || x.id === grupoAtual);
  const sugestoes = (Array.isArray(vocabulario.data) ? vocabulario.data : []).filter(
    (s) => !g.tags.includes(s),
  );
  const visualizacoes: Record<VisibilityMode, string> = {
    all: t("Usuários visualizam todos os negócios"),
    own: t("Usuários visualizam apenas seus negócios"),
    own_and_unassigned: t("Usuários visualizam seus negócios e sem dono"),
  };
  const mudarGerais = (parcial: Partial<typeof g>) =>
    mudar((r) => ({ ...r, gerais: { ...r.gerais, ...parcial } }));

  /** O "Salvar" do balão da tag: devolve o erro (o balão fica aberto) ou null (fecha). */
  function adicionarTag(bruta: string): string | null {
    const tag = normalizarTag(bruta);
    if (!tag) return null;
    if (tag === TAG_DO_SISTEMA) return t("A tag «cliente» é do sistema. Escolha outra.");
    if (!g.tags.includes(tag)) {
      if (g.tags.length >= TAGS_PADRAO_MAX) return t("Uma origem tem no máximo 10 tags padrão.");
      mudarGerais({ tags: [...g.tags, tag] });
    }
    return null;
  }

  /** O "Salvar" do balão do grupo: cria pela rota da 1B; o erro da rota aparece no topo da seção. */
  function criarONovoGrupo(bruto: string): string | null {
    const nome = bruto.trim();
    if (!nome) return null;
    criarGrupo.mutate(nome, {
      onSuccess: (resposta) => {
        onOrigens(resposta);
        const criado = resposta.grupos.find(
          (x) => x.name.trim().toLowerCase() === nome.toLowerCase(),
        );
        if (criado) mudarGerais({ grupo: criado.id });
        setErro(null);
      },
      onError: (e) => setErro(textoDoErro(e, t)),
    });
    return null;
  }

  return (
    <div className="grid gap-6">
      <CabecaDaSecao
        icone={Settings}
        descricao={t("Configure aqui a sua origem de dados.")}
        ajuda={t(
          "Origem de dados, são fontes de geração de contatos, elas podem ser manuais (cadastro individual e/ou importação) ou automáticas (formulários e/ou integrações com ferramentas como Eduzz/Hotmart).",
        )}
      />
      {erro ? (
        <p
          role="alert"
          className="rounded-[4px] bg-casca-marca-suave p-2 text-[13px] text-casca-alerta"
        >
          {erro}
        </p>
      ) : null}

      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          value={g.nome}
          onChange={(e) => mudarGerais({ nome: e.target.value })}
          aria-label={t("Nome da origem")}
          maxLength={80}
          className="h-11 text-[11.9px] font-light"
        />
      </Campo>

      <Campo rotulo={t("Grupo")}>
        <div className="flex items-center gap-[22px]">
          <div className="w-[711px] min-w-0">
            <SeletorDaCasca
              aparencia="janela"
              valor={g.grupo ?? ""}
              opcoes={grupos.map((x) => ({ valor: x.id, rotulo: x.name }))}
              aoMudar={(v) => mudarGerais({ grupo: v || null })}
              aria-label={t("Grupo")}
              className="text-[11.9px] font-light"
            />
          </div>
          {/* Sem print do ⊕ do grupo: o mesmo balão "Nome" da tag e do motivo (P05, P09), a conferir. */}
          <BalaoDoNome
            aria-label={t("Nome do novo grupo")}
            placeholder={t("Adicione um grupo")}
            maxLength={60}
            align="end"
            aoSalvar={criarONovoGrupo}
            gatilho={
              <button
                type="button"
                aria-label={t("Novo grupo")}
                disabled={criarGrupo.isPending}
                className="grid size-[22px] shrink-0 place-items-center text-casca-texto hover:text-casca-marca"
              >
                <CirclePlus size={22} strokeWidth={1.5} aria-hidden />
              </button>
            }
          />
        </div>
      </Campo>

      <Campo rotulo={t("Visualização de negócios")}>
        {/* 1J (D11): a regra DESTA origem. Mostra a que vale hoje (a da origem ou, sem ela, a da organização) e grava a escolhida (N12). */}
        <SeletorDaCasca
          aparencia="janela"
          valor={g.visualizacao}
          opcoes={VISUALIZACOES.map((v) => ({ valor: v, rotulo: visualizacoes[v] }))}
          aoMudar={(v) => v && mudarGerais({ visualizacao: v })}
          aria-label={t("Visualização de negócios")}
          className="text-[11.9px] font-light"
        />
      </Campo>

      <div className="-mt-[14px] grid gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-casca-texto">
          {t("Moeda da origem")}
          <AjudaDaCasca
            texto={t("Selecione o tipo de moeda que você quer apenas para essa origem.")}
          />
        </span>
        <SeletorDeMoeda
          valor={g.moeda}
          aoMudar={(moeda) => mudarGerais({ moeda })}
          aria-label={t("Moeda da origem")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[30px]">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-casca-texto">
          {t("Tags")}
          <AjudaDaCasca
            texto={t(
              "Configure uma tag para ser aplicada a todos os contatos que entram nesta origem.",
            )}
          />
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <BalaoDoNome
            aria-label={t("Nova tag")}
            placeholder={t("Adicione uma tag")}
            sugestoes={sugestoes}
            maxLength={TAMANHO_MAXIMO_DA_TAG}
            aoSalvar={adicionarTag}
            gatilho={
              <button
                type="button"
                aria-label={t("Adicionar tag")}
                className="flex h-6 items-center gap-1 rounded-full border border-casca-borda bg-surface px-3 text-[10px] font-light text-casca-texto hover:bg-casca-raia"
              >
                <Plus size={11} aria-hidden />
                {t("Adicionar tag")}
              </button>
            }
          />
          {g.tags.map((tag) => (
            <span
              key={tag}
              data-chip=""
              className="flex h-[18px] items-center gap-1 rounded-full bg-casca-marca-suave px-2 text-[11px] font-light text-casca-texto"
            >
              {tag}
              <button
                type="button"
                aria-label={`${t("Tirar a tag")} ${tag}`}
                onClick={() => mudarGerais({ tags: g.tags.filter((x) => x !== tag) })}
              >
                <X size={10} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
