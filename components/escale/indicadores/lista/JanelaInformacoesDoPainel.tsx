"use client";
import { useState } from "react";
import { toast } from "sonner";

import { membrosAtivosDaEquipe } from "@/components/escale/configuracoes/ListaDePessoas";
import { Campo, CampoDeTexto, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { DialogTitle } from "@/components/ui/dialog";
import { useAcoesDosPaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { ApiError } from "@/lib/api/types";
import { ROTULO_DO_PAPEL } from "@/lib/auth/types";
import { PAPEIS_DO_PAINEL, camposMudados, textoDaContagem } from "@/lib/escale/indicadores/paineis/regras";
import type { EdicaoDoPainel, PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

import { SeletorComChipsDaMarca } from "./SeletorComChipsDaMarca";
import { SeletorDeIconeDoPainel } from "./SeletorDeIconeDoPainel";

type Aba = "geral" | "permissoes";

const edicaoDe = (p: PainelDaLista): EdicaoDoPainel => ({
  nome: p.nome,
  cor: p.cor,
  icone: p.icone,
  permissoesUsuarios: p.permissoesUsuarios,
  permissoesPapeis: p.permissoesPapeis,
});

/**
 * O MODAL "INFORMAÇÕES DO DASHBOARD" (10-003, 10-004): aba Geral (nome, cor, ícone)
 * e aba Permissões (usuários e papéis — papéis no lugar dos setores, decisão 5).
 * "Salvar" só com mudança e nome preenchido; manda só os campos mudados.
 * Só gerente ou acima o abre (o ⋮ é deles), então `/api/v1/team` responde.
 */
export function JanelaInformacoesDoPainel({ painel, aoFechar }: { painel: PainelDaLista; aoFechar: () => void }) {
  const t = useT();
  const { editar } = useAcoesDosPaineis();
  const equipe = useTeamMembers();
  const [aba, setAba] = useState<Aba>("geral");
  const [edicao, setEdicao] = useState<EdicaoDoPainel>(() => edicaoDe(painel));
  const mudancas = camposMudados(edicaoDe(painel), edicao);
  const podeSalvar = Object.keys(mudancas).length > 0 && edicao.nome.trim().length > 0;
  const mexeuEmPermissoes = "permissoesUsuarios" in mudancas || "permissoesPapeis" in mudancas;
  const mudar = (parcial: Partial<EdicaoDoPainel>) => setEdicao((e) => ({ ...e, ...parcial }));

  const usuarios = membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")).map((m) => ({ valor: m.id, rotulo: m.nome }));
  const papeis = PAPEIS_DO_PAINEL.map((p) => ({ valor: p, rotulo: t(ROTULO_DO_PAPEL[p]) }));
  const contagem = (n: number, tipo: "usuario" | "papel") => t(textoDaContagem(n, tipo)).replace("{n}", String(n));

  function salvar() {
    editar.mutate(
      { id: painel.id, edicao: mudancas },
      {
        onSuccess: () => {
          toast.success(
            mexeuEmPermissoes
              ? t("As configurações de permissão foram salvas com sucesso!")
              : t("Dashboard editado com sucesso!"),
          );
          aoFechar();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) toast.error(err.message);
          else if (mexeuEmPermissoes) toast.error(t("Erro ao salvar as configurações de permissão."));
          else if (err instanceof ApiError) showApiError(err);
          else toast.error(t("Erro inesperado."));
        },
      },
    );
  }

  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[min(48rem,calc(100vw-2rem))] gap-0 p-0">
      <div className="flex h-14 items-center border-b border-casca-divisoria px-6">
        <DialogTitle className="text-[15px] font-semibold text-casca-texto">{t("Informações do Dashboard")}</DialogTitle>
      </div>
      <div className="grid gap-6 px-10 pt-6 pb-8">
        <AbasDaCasca
          aria-label={t("Informações do Dashboard")}
          abas={[
            { valor: "geral", rotulo: t("Geral") },
            { valor: "permissoes", rotulo: t("Permissões") },
          ]}
          valor={aba}
          aoMudar={setAba}
        />
        {aba === "geral" ? (
          <div className="grid gap-6">
            <Campo rotulo={t("Nome")} obrigatorio>
              <CampoDeTexto
                aria-label={t("Nome")}
                value={edicao.nome}
                maxLength={80}
                placeholder={t("Digite o nome do dashboard")}
                onChange={(e) => mudar({ nome: e.target.value })}
                className="h-8 rounded-[6px] px-3"
              />
            </Campo>
            <SeletorDeIconeDoPainel nome={edicao.nome} cor={edicao.cor} icone={edicao.icone} aoMudar={mudar} />
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-2">
              <span className="text-[12px] text-casca-texto-2">{contagem(edicao.permissoesUsuarios.length, "usuario")}</span>
              <SeletorComChipsDaMarca
                aria-label={t("Usuários")}
                valores={edicao.permissoesUsuarios}
                opcoes={usuarios}
                aoMudar={(v) => mudar({ permissoesUsuarios: v })}
                placeholder={t("Selecione os usuários que poderão visualizar o dashboard")}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-[12px] text-casca-texto-2">{contagem(edicao.permissoesPapeis.length, "papel")}</span>
              <SeletorComChipsDaMarca
                aria-label={t("Papéis")}
                valores={edicao.permissoesPapeis}
                opcoes={papeis}
                aoMudar={(v) => mudar({ permissoesPapeis: v })}
                placeholder={t("Selecione os papéis que poderão visualizar o dashboard")}
              />
            </div>
            <p className="text-[11px] text-casca-suave">
              {t(
                "Sem nenhum usuário ou papel selecionado, todos com acesso a Indicadores veem o dashboard. Administradores sempre veem.",
              )}
            </p>
          </div>
        )}
      </div>
      <div className="flex h-[72px] items-center justify-end gap-2 border-t border-casca-divisoria px-6">
        <button
          type="button"
          onClick={aoFechar}
          className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] text-casca-texto hover:bg-casca-raia"
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={!podeSalvar || editar.isPending}
          className="inline-flex h-8 items-center rounded-casca-gatilho bg-casca-marca px-3.5 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-50"
        >
          {t("Salvar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
