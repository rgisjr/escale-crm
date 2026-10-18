"use client";
import { useMemo, useState, type FormEvent } from "react";

import { ContadorDePessoas, membrosAtivosDaEquipe } from "@/components/escale/configuracoes/ListaDePessoas";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useAtualizarGrupo, useCriarGrupo, useExcluirGrupo } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { corDoIconeNaCasca } from "@/lib/escale/origens/cores-da-casca";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  type IconeDeGrupo,
} from "@/lib/escale/origens/regras";
import { NOME_DO_TOM, PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, RodapeDaJanela } from "./JanelaDaCasca";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { textoDoErro } from "./texto-do-erro";

/** O aviso de erro das janelas. Também é usado pela janela do filtro salvo (1D); não mudou. */
export function Alerta({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
      {texto}
    </p>
  );
}

function GrupoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <CabecaDaJanela titulo={t("Grupo não encontrado.")} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={onFechar}>
          {t("Fechar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}

export function FormAdicionarGrupo({ onFechar, onOrigens }: PropsDaJanela) {
  const t = useT();
  const criar = useCriarGrupo();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    criar.mutate(nome, {
      onSuccess: (origens) => {
        onOrigens(origens);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Adicionar grupo de origens")}
        descricao={t("O grupo nasce vazio. Use o + dele para criar origens dentro.")}
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome do novo grupo")}
          placeholder={t("Nome do novo grupo")}
          maxLength={NOME_DE_GRUPO_MAX}
        />
      </Campo>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={criar.isPending || !nome.trim()}>
          {t("Criar grupo")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormConfigGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [nome, setNome] = useState(grupo?.name ?? "");
  // 1J (Q6): quem vê o grupo. A origem sem lista própria segue esta.
  const [pessoas, setPessoas] = useState<string[]>(grupo?.pessoas ?? []);
  const equipe = useTeamMembers();
  const membros = useMemo(
    () => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")),
    [equipe.data, t],
  );
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    atualizar.mutate(
      { id, mudanca: { name: nome, pessoas } },
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
      <CabecaDaJanela titulo={t("Configurações do grupo")} />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome do grupo")}
          maxLength={NOME_DE_GRUPO_MAX}
        />
      </Campo>
      <section className="grid gap-2">
        <h3 className="text-[13px] font-medium text-casca-texto">{t("Permissão de usuários")}</h3>
        <p className="text-[11px] text-casca-suave">
          {t(
            "Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição.",
          )}
        </p>
        <SeletorMultiploDaCasca
          valores={pessoas}
          opcoes={membros.map((m) => ({ valor: m.id, rotulo: m.nome }))}
          aoMudar={setPessoas}
          vazio={t("Selecione os usuários que poderão visualizar o grupo")}
          aria-label={t("Selecione os usuários que poderão visualizar o grupo")}
        />
        <ContadorDePessoas total={pessoas.length} />
      </section>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={atualizar.isPending || !nome.trim()}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

/**
 * Customizar (sem print da Clint, item 12): a cor e o ícone do grupo.
 * Os quadradinhos mostram a cor da Clint de cada tom (`corDoIconeNaCasca`), mas
 * o que se grava continua sendo o tom da paleta — a rota só aceita a paleta.
 */
export function FormCustomizarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [cor, setCor] = useState<string | null>(grupo?.color ?? null);
  const [icone, setIcone] = useState<IconeDeGrupo>(grupo?.icon ?? "iniciais");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function salvar() {
    atualizar.mutate(
      { id, mudanca: { color: cor, icon: icone } },
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
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={
          <>
            {t("Customizar")} «{grupo.name}»
          </>
        }
      />
      <Alerta texto={erro} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium text-casca-texto">{t("Cor")}</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={cor === null}
            onClick={() => setCor(null)}
            className={cn(
              "h-7 rounded-[4px] px-2 text-xs text-casca-texto",
              cor === null ? "bg-casca-marca-suave ring-2 ring-casca-marca" : "bg-casca-raia",
            )}
          >
            {t("Cor automática")}
          </button>
          {PALETA_DE_ETIQUETAS.map((tom) => (
            <button
              key={tom}
              type="button"
              aria-label={t(NOME_DO_TOM[tom] ?? tom)}
              aria-pressed={cor === tom}
              onClick={() => setCor(tom)}
              className={cn("size-7 rounded-[4px]", cor === tom && "ring-2 ring-casca-marca ring-offset-2")}
              style={{ backgroundColor: corDoIconeNaCasca(tom) }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium text-casca-texto">{t("Ícone")}</legend>
        <div className="flex flex-wrap gap-2">
          {ICONES_DE_GRUPO.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={t(ROTULO_DO_ICONE[i] ?? i)}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={cn(
                "grid h-9 w-11 place-items-center rounded-[4px] border",
                icone === i ? "border-casca-marca bg-casca-marca-suave" : "border-casca-borda",
              )}
            >
              <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: i }} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-casca-suave">{t("Prévia")}</span>
        <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: icone }} />
        <span className="text-casca-texto">{grupo.name}</span>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={atualizar.isPending}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormArquivarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id && !f.is_archived).length;

  function arquivar() {
    atualizar.mutate(
      { id, mudanca: { is_archived: true } },
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
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Arquivar «{nome}»?").replace("{nome}", grupo.name)}
        descricao={t(
          "O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.",
        ).replace("{n}", String(n))}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={arquivar} disabled={atualizar.isPending}>
          {t("Arquivar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormExcluirGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirGrupo();
  const outros = origens.grupos.filter((g) => g.id !== id && !g.is_archived);
  const [destino, setDestino] = useState<string | null>(outros[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id).length;

  function enviar() {
    excluir.mutate(
      { id, destino: n > 0 ? destino : null },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  if (n > 0 && outros.length === 0) {
    return (
      <div className="grid gap-5">
        <CabecaDaJanela
          titulo={t("«{nome}» é o único grupo").replace("{nome}", grupo.name)}
          descricao={t(
            "Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.",
          )}
        />
        <RodapeDaJanela>
          <BotaoDaJanela variante="salvar" onClick={onFechar}>
            {t("Entendi")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Excluir «{nome}»?").replace("{nome}", grupo.name)}
        descricao={
          n === 0
            ? t("O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.")
            : t(
                "Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.",
              ).replace("{n}", String(n))
        }
      />
      <Alerta texto={erro} />
      {n > 0 && (
        <Campo rotulo={t("Mover as origens para")}>
          <SeletorDaCasca
            valor={destino ?? ""}
            opcoes={outros.map((g) => ({ valor: g.id, rotulo: g.name }))}
            aoMudar={(v) => setDestino(v || null)}
            aria-label={t("Mover as origens para")}
          />
        </Campo>
      )}
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="perigo" onClick={enviar} disabled={excluir.isPending || (n > 0 && !destino)}>
          {n === 0 ? t("Excluir grupo") : t("Mover e excluir grupo")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}
