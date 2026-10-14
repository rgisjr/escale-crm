"use client";
import { useState, type FormEvent } from "react";

import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useAtualizarVisualizacao,
  useCriarVisualizacao,
  useExcluirVisualizacao,
} from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  NOME_DE_VISUALIZACAO_MAX,
  type AcessoDaVisualizacao,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import { randomId } from "@/lib/random-id";

export type JanelaDaVisualizacao =
  | { tipo: "nova"; origens: string[] }
  | { tipo: "configurar"; id: string }
  | { tipo: "excluir"; id: string };

interface PropsComuns {
  visualizacoes: Visualizacao[];
  onFechar: () => void;
  onVisualizacoes: (lista: Visualizacao[]) => void;
}

/**
 * As janelas das visualizações (fork Escale, Fase 1C): um Dialog só, como
 * `JanelasDeOrigens`. Só gerente+ chega aqui — o painel esconde o + e o ⋮, e as
 * rotas cobram `requireRole("manager")`.
 */
export function JanelasDaVisualizacao({
  janela,
  onCriada,
  onExcluida,
  ...comuns
}: PropsComuns & {
  janela: JanelaDaVisualizacao | null;
  onCriada: (id: string) => void;
  onExcluida: (id: string) => void;
}) {
  const alvo = janela && janela.tipo !== "nova" ? comuns.visualizacoes.find((v) => v.id === janela.id) : undefined;
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberto) => {
        if (!aberto) comuns.onFechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        {janela?.tipo === "nova" && <FormDaVisualizacao {...comuns} origens={janela.origens} onCriada={onCriada} />}
        {janela?.tipo === "configurar" &&
          (alvo ? <FormDaVisualizacao {...comuns} atual={alvo} /> : <VisualizacaoSumiu onFechar={comuns.onFechar} />)}
        {janela?.tipo === "excluir" &&
          (alvo ? (
            <FormExcluirVisualizacao {...comuns} atual={alvo} onExcluida={onExcluida} />
          ) : (
            <VisualizacaoSumiu onFechar={comuns.onFechar} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

function VisualizacaoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Visualização não encontrada.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Nome e QUEM VÊ (princípio do produto: quase tudo tem acesso configurável).
 * Sem `atual` é a janela "Nova visualização", com as origens do rascunho; com
 * `atual` é "Configurações da visualização" (as origens se trocam pelo
 * "Editar origens" do ⋮, no próprio painel).
 */
function FormDaVisualizacao({
  atual,
  origens = [],
  onCriada,
  onFechar,
  onVisualizacoes,
}: PropsComuns & { atual?: Visualizacao; origens?: string[]; onCriada?: (id: string) => void }) {
  const t = useT();
  const criar = useCriarVisualizacao();
  const atualizar = useAtualizarVisualizacao();
  // O id nasce aqui para a tela saber para onde ir assim que a rota responder.
  const [id] = useState(() => atual?.id ?? randomId());
  const [nome, setNome] = useState(atual?.name ?? "");
  const [acesso, setAcesso] = useState<AcessoDaVisualizacao>(atual?.acesso ?? "todos");
  const [pessoas, setPessoas] = useState<ReadonlySet<string>>(() => new Set(atual?.pessoas ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const { data: equipe, isLoading } = useTeamMembers({ enabled: acesso === "escolhidos" });
  // Quem ainda não aceitou o convite ou já saiu não entra na lista: a FK do
  // banco recusaria quem não é membro.
  const membros = (equipe?.data ?? []).filter((m) => m.accepted_at && !m.revoked_at);
  const pendente = criar.isPending || atualizar.isPending;
  const podeSalvar = nome.trim().length > 0 && (acesso === "todos" || pessoas.size > 0) && !pendente;

  function alternarPessoa(userId: string) {
    setPessoas((antes) => {
      const depois = new Set(antes);
      if (depois.has(userId)) depois.delete(userId);
      else depois.add(userId);
      return depois;
    });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!podeSalvar) return;
    const escolhidas = acesso === "escolhidos" ? [...pessoas] : [];
    const aoErrar = (err: unknown) => setErro(textoDoErro(err, t));
    if (atual) {
      atualizar.mutate(
        { id, mudanca: { name: nome, acesso, pessoas: escolhidas } },
        {
          onSuccess: (lista) => {
            onVisualizacoes(lista);
            onFechar();
          },
          onError: aoErrar,
        },
      );
      return;
    }
    criar.mutate(
      { id, name: nome, acesso, origens, pessoas: escolhidas },
      {
        onSuccess: (lista) => {
          onVisualizacoes(lista);
          onFechar();
          onCriada?.(id);
        },
        onError: aoErrar,
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{atual ? t("Configurações da visualização") : t("Nova visualização")}</DialogTitle>
        <DialogDescription>{t("Etapas com o mesmo nome viram uma coluna só e somam os cards.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da visualização")}
        placeholder={t("Nome da visualização")}
        maxLength={NOME_DE_VISUALIZACAO_MAX}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("Quem vê")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "todos"}
            onChange={() => setAcesso("todos")}
            className="accent-accent"
          />
          {t("Toda a organização")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "escolhidos"}
            onChange={() => setAcesso("escolhidos")}
            className="accent-accent"
          />
          {t("Só as pessoas escolhidas")}
        </label>
        <p className="text-xs text-muted-foreground">
          {t("Gerentes e administradores sempre veem. Dentro da visualização, cada pessoa vê só os negócios que já vê em cada origem.")}
        </p>
        {acesso === "escolhidos" &&
          (isLoading ? (
            <p className="text-xs text-muted-foreground">{t("Carregando…")}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {membros.map((m) => (
                <li key={m.user_id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pessoas.has(m.user_id)}
                      onChange={() => alternarPessoa(m.user_id)}
                      className="size-4 accent-accent"
                    />
                    {m.full_name ?? m.email ?? t("Sem nome")}
                  </label>
                </li>
              ))}
            </ul>
          ))}
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={!podeSalvar}>
          {atual ? t("Salvar") : t("Criar visualização")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormExcluirVisualizacao({
  atual,
  onFechar,
  onVisualizacoes,
  onExcluida,
}: PropsComuns & { atual: Visualizacao; onExcluida: (id: string) => void }) {
  const t = useT();
  const excluir = useExcluirVisualizacao();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}»?").replace("{nome}", atual.name)}</DialogTitle>
        <DialogDescription>{t("A visualização sai do painel. Nenhuma origem e nenhum negócio é apagado.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={excluir.isPending}
          onClick={() =>
            excluir.mutate(atual.id, {
              onSuccess: (lista) => {
                onVisualizacoes(lista);
                onFechar();
                onExcluida(atual.id);
              },
              onError: (err) => setErro(textoDoErro(err, t)),
            })
          }
        >
          {t("Excluir visualização")}
        </Button>
      </DialogFooter>
    </>
  );
}
