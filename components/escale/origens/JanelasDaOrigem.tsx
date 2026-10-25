"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import {
  useArquivarOrigem,
  useCriarOrigem,
  useExcluirOrigem,
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
  const router = useRouter();
  const caminho = usePathname();
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
  // Excluída a origem que está aberta no quadro, a tela ficaria num funil que não existe mais.
  const aoExcluir = {
    ...aoTerminar,
    onSuccess: (r: Parameters<PropsDaJanela["onOrigens"]>[0]) => {
      aoTerminar.onSuccess(r);
      if (caminho?.includes(`/pipelines/${id}`)) router.replace("/app/escale/negocios");
    },
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
        <BotaoDaJanela variante="perigo" onClick={() => excluir.mutate(id, aoExcluir)} disabled={excluir.isPending}>
          {t("Excluir de vez")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}
