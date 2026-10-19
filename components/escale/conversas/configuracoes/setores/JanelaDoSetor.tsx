"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useSalvarSetor } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  COR_PADRAO_DO_SETOR,
  CORES_DO_SETOR,
  type SetorLido,
} from "@/lib/escale/conversas/setores";
import { Search, Trash2, Users } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaPessoa } from "../FotoDaPessoa";

/**
 * "CRIE UM SETOR" / "EDITAR SETOR" (c42, c88, c89; E1): o nome, o seletor
 * para adicionar pessoas, a lista dos selecionados com busca e lixeira, a
 * prévia e a paleta de 24 cores. "Criar setor" / "Salvar alterações".
 */
export function JanelaDoSetor({
  aberta,
  aoFechar,
  setor,
}: {
  aberta: boolean;
  aoFechar: () => void;
  setor: SetorLido | null;
}) {
  const t = useT();
  const salvar = useSalvarSetor();
  const { data: equipe } = useTeamMembers({ enabled: aberta });
  const pessoas = useMemo(
    () =>
      (equipe?.data ?? [])
        .filter((m) => !m.revoked_at && m.role !== "viewer")
        .map((m) => ({
          id: m.user_id,
          nome: m.full_name?.trim() || m.email || "",
          email: m.email ?? "",
        })),
    [equipe],
  );
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<string>(COR_PADRAO_DO_SETOR);
  const [membros, setMembros] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    if (!aberta) return;
    setNome(setor?.nome ?? "");
    setCor(setor?.cor ?? COR_PADRAO_DO_SETOR);
    setMembros(setor?.membros ?? []);
    setBusca("");
  }, [aberta, setor]);

  const selecionados = pessoas.filter((p) => membros.includes(p.id));
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? selecionados.filter(
        (p) => p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo),
      )
    : selecionados;
  const disponiveis = pessoas
    .filter((p) => !membros.includes(p.id))
    .map((p) => ({ valor: p.id, rotulo: `${p.nome} · ${p.email}` }));
  const podeSalvar = nome.trim().length > 0 && !salvar.isPending;

  const confirmar = async () => {
    if (!podeSalvar) return;
    await salvar.mutateAsync({
      ...(setor ? { id: setor.id } : {}),
      nome: nome.trim(),
      cor,
      membros,
    });
    toast.success(setor ? t("Setor atualizado.") : t("Setor criado."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[576px]">
      <CabecaDaJanela titulo={setor ? t("Editar setor") : t("Crie um setor")} />
      <div className="flex max-h-[440px] flex-col gap-5 overflow-y-auto pr-1">
        <Campo rotulo={t("Nome do setor")}>
          <CampoDeTexto
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("Digite um nome para o setor")}
            maxLength={60}
          />
        </Campo>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-casca-texto">
            {t("Adicione usuários a este setor")}
            <AjudaDaCasca texto={t("Para adicionar usuários, pesquise pelo nome ou email.")} />
          </span>
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={t("Adicione um usuário no setor")}
            opcoes={disponiveis}
            buscaAPartirDe={0}
            aoMudar={(id) => id && setMembros((m) => [...m, id])}
            aria-label={t("Adicione um usuário no setor")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-casca-texto">
              {selecionados.length > 1 ? t("Usuários selecionados") : t("Usuário selecionado")}
            </span>
            <span className="flex h-8 w-[190px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar por nome ou e-mail")}
                className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta"
              />
              <Search size={14} aria-hidden className="text-casca-suave" />
            </span>
          </div>
          {selecionados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="grid size-14 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">
                <Users size={24} aria-hidden />
              </span>
              <span className="text-[15px] font-semibold text-casca-texto">
                {t("Você ainda não adicionou usuários")}
              </span>
            </div>
          ) : (
            <ul className="flex max-h-[220px] flex-col overflow-y-auto">
              {visiveis.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-1.5">
                  <FotoDaPessoa id={p.id} nome={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-casca-texto">{p.nome}</span>
                    <span className="block truncate text-[13px] text-casca-suave">{p.email}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${p.nome}`}
                    onClick={() => setMembros((m) => m.filter((x) => x !== p.id))}
                    className="grid size-7 place-items-center rounded text-casca-alerta hover:bg-casca-atraso"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-6 border-t border-casca-borda pt-5">
          <span
            aria-hidden
            className="h-14 w-16 shrink-0 rounded-casca-gatilho"
            style={{ backgroundColor: cor }}
          />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-casca-texto">{t("Cores")}</span>
            <div
              role="radiogroup"
              aria-label={t("Cores")}
              className="grid grid-cols-12 gap-x-4 gap-y-2.5"
            >
              {CORES_DO_SETOR.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cor === c}
                  aria-label={c}
                  onClick={() => setCor(c)}
                  className={cn(
                    "size-4 rounded-full",
                    cor === c && "ring-2 ring-casca-marca ring-offset-2",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!podeSalvar} onClick={() => void confirmar()}>
          {setor ? t("Salvar alterações") : t("Criar setor")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
