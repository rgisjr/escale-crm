"use client";
import { useState, type FormEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import {
  useArquivarOrigem,
  useAtualizarOrigem,
  useCriarOrigem,
  useExcluirOrigem,
  type MudancaDeOrigem,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, RodapeDaJanela } from "./JanelaDaCasca";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { Alerta } from "./JanelasDoGrupo";
import { textoDoErro } from "./texto-do-erro";

function OrigemSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <CabecaDaJanela titulo={t("Funil não encontrado.")} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={onFechar}>
          {t("Fechar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}

export function FormAdicionarOrigem({
  origens,
  onFechar,
  onOrigens,
  grupoId,
  onAbrirOrigem,
}: PropsDaJanela & { grupoId: string | null; onAbrirOrigem: (id: string) => void }) {
  const t = useT();
  const criar = useCriarOrigem();
  const ativos = origens.grupos.filter((g) => !g.is_archived);
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<string | null>(
    ativos.some((g) => g.id === grupoId) ? grupoId : (ativos[0]?.id ?? null),
  );
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !grupo) return;
    criar.mutate(
      { name: nome, groupId: grupo },
      {
        onSuccess: (r) => {
          onOrigens(r.origens);
          onAbrirOrigem(r.id);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Adicionar origem")}
        descricao={
          ativos.length === 0
            ? t("Crie um grupo antes, pelo + ao lado da lupa.")
            : t("Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.")
        }
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome da origem")}
          placeholder={t("Nome da origem")}
          maxLength={80}
        />
      </Campo>
      <Campo rotulo={t("Grupo")}>
        <SeletorDaCasca
          valor={grupo ?? ""}
          opcoes={ativos.map((g) => ({ valor: g.id, rotulo: g.name }))}
          aoMudar={(v) => setGrupo(v || null)}
          aria-label={t("Grupo")}
        />
      </Campo>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={criar.isPending || !nome.trim() || !grupo}>
          {t("Criar origem")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormConfigOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarOrigem();
  const funil = origens.funis.find((f) => f.id === id);
  const ativos = origens.grupos.filter((g) => !g.is_archived || g.id === funil?.group_id);
  const [nome, setNome] = useState(funil?.name ?? "");
  const [grupo, setGrupo] = useState<string | null>(funil?.group_id ?? null);
  const [tornarPadrao, setTornarPadrao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const mudanca: MudancaDeOrigem = {};
    if (nome.trim() && nome.trim() !== funil!.name) mudanca.name = nome;
    if (grupo && grupo !== funil!.group_id) mudanca.groupId = grupo;
    if (tornarPadrao) mudanca.tornarPadrao = true;
    if (Object.keys(mudanca).length === 0) return onFechar();
    atualizar.mutate(
      { id, mudanca },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Configurações da origem")}
        descricao={t("As etapas continuam sendo editadas no próprio quadro.")}
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome da origem")}
          maxLength={80}
        />
      </Campo>
      <Campo rotulo={t("Grupo")}>
        <SeletorDaCasca
          valor={grupo ?? ""}
          opcoes={ativos.map((g) => ({ valor: g.id, rotulo: g.name }))}
          aoMudar={(v) => setGrupo(v || null)}
          aria-label={t("Grupo")}
        />
      </Campo>
      {funil.is_default ? (
        <p className="text-[13px] text-casca-suave">{t("Esta é a origem padrão da organização.")}</p>
      ) : (
        <div className="grid gap-1">
          <CaixaDaCasca
            marcada={tornarPadrao}
            aoMudar={setTornarPadrao}
            rotulo={t("Tornar esta a origem padrão")}
            aria-label={t("Tornar esta a origem padrão")}
          />
          <p className="pl-7 text-xs text-casca-suave">{t("Abre para quem ainda não abriu nenhuma origem.")}</p>
        </div>
      )}
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={atualizar.isPending}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormArquivarOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function confirmar() {
    arquivar.mutate(id, {
      onSuccess: (r) => {
        onOrigens(r);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Arquivar «{nome}»?").replace("{nome}", funil.name)}
        descricao={t("A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.")}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={confirmar} disabled={arquivar.isPending}>
          {t("Arquivar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormExcluirOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirOrigem();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  const aoTerminar = {
    onSuccess: (r: Parameters<PropsDaJanela["onOrigens"]>[0]) => {
      onOrigens(r);
      onFechar();
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Excluir «{nome}» de vez?").replace("{nome}", funil.name)}
        descricao={t(
          "A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.",
        )}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        {erro && !funil.is_archived && (
          <BotaoDaJanela
            variante="salvar"
            onClick={() => arquivar.mutate(id, aoTerminar)}
            disabled={arquivar.isPending}
          >
            {t("Arquivar")}
          </BotaoDaJanela>
        )}
        <BotaoDaJanela variante="perigo" onClick={() => excluir.mutate(id, aoTerminar)} disabled={excluir.isPending}>
          {t("Excluir de vez")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}
