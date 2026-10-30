"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useAcoesDasPastas } from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { mostrarSemPasta, type ContagensDoTrilho } from "@/lib/escale/automacoes/regras";
import type { PastaDeAutomacao, Visao } from "@/lib/escale/automacoes/tipos";
import { FolderOff, FolderPlus, List, Star } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { EditorDePasta, type DadosDaPasta } from "./EditorDePasta";
import { IconeDaPasta } from "./IconeDaPasta";
import { MenuDaPasta } from "./MenuDaPasta";

const ITEM = "group flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-150";

function Item({
  ativo,
  onClick,
  icone,
  rotulo,
  contador,
  menu,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  rotulo: string;
  contador: number;
  menu?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        ITEM,
        ativo ? "bg-casca-marca-suave text-casca-marca" : "text-casca-texto-2 hover:bg-casca-raia",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={ativo ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {icone}
        <span className="truncate">{rotulo}</span>
      </button>
      {menu ? (
        <span className="relative grid min-w-4 place-items-center">
          <span className="text-[10px] text-casca-suave group-focus-within:invisible group-hover:invisible">
            {contador}
          </span>
          <span className="absolute inset-0 hidden place-items-center group-focus-within:grid group-hover:grid">
            {menu}
          </span>
        </span>
      ) : (
        <span className="text-[10px] text-casca-suave">{contador}</span>
      )}
    </div>
  );
}

const mesmaVisao = (a: Visao, b: Visao): boolean =>
  a.tipo === b.tipo && (a.tipo !== "pasta" || (b.tipo === "pasta" && a.id === b.id));

/** O TRILHO DE PASTAS (07-001, 07-007, 07-008, 07-031): Todas, Favoritos, as pastas e "Sem pasta". */
export function TrilhoDePastas({
  pastas,
  contagens,
  visao,
  carregando,
  aoMudarVisao,
}: {
  pastas: PastaDeAutomacao[];
  contagens: ContagensDoTrilho;
  visao: Visao;
  carregando: boolean;
  aoMudarVisao: (v: Visao) => void;
}) {
  const t = useT();
  const acoes = useAcoesDasPastas();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<PastaDeAutomacao | null>(null);
  const semPasta = mostrarSemPasta(contagens, pastas.length);

  // Efeito da Clint: "Sem pasta" some quando não há mais o que mostrar nela; a visão volta para "Todas".
  useEffect(() => {
    if (!carregando && visao.tipo === "sem_pasta" && !semPasta) aoMudarVisao({ tipo: "todas" });
  }, [carregando, visao.tipo, semPasta, aoMudarVisao]);

  function salvarNova(p: DadosDaPasta) {
    acoes.criar.mutate(p, { onSuccess: () => setCriando(false) });
  }

  function salvarEdicao(pasta: PastaDeAutomacao, p: DadosDaPasta) {
    const mudou: Partial<DadosDaPasta> = {};
    if (p.nome !== pasta.nome) mudou.nome = p.nome;
    if (p.cor !== pasta.cor) mudou.cor = p.cor;
    if (p.icone !== pasta.icone) mudou.icone = p.icone;
    if (Object.keys(mudou).length === 0) {
      setEditando(null);
      return;
    }
    acoes.editar.mutate({ id: pasta.id, ...mudou }, { onSuccess: () => setEditando(null) });
  }

  function confirmarExclusao() {
    const pasta = excluindo;
    if (!pasta) return;
    acoes.excluir.mutate(pasta.id, {
      onSuccess: () => {
        toast.success(t("Pasta excluída"));
        if (visao.tipo === "pasta" && visao.id === pasta.id) aoMudarVisao({ tipo: "todas" });
        setExcluindo(null);
      },
    });
  }

  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-casca-divisoria px-2 pt-3" aria-label={t("Pastas")}>
      <Item
        ativo={visao.tipo === "todas"}
        onClick={() => aoMudarVisao({ tipo: "todas" })}
        icone={<List size={14} aria-hidden />}
        rotulo={t("Todas")}
        contador={contagens.todas}
      />
      <Item
        ativo={visao.tipo === "favoritos"}
        onClick={() => aoMudarVisao({ tipo: "favoritos" })}
        icone={<Star size={14} aria-hidden />}
        rotulo={t("Favoritos")}
        contador={contagens.favoritos}
      />
      <p className="mt-3 mb-1 px-2 text-[10px] font-semibold tracking-[0.1em] text-casca-suave uppercase">
        {t("Pastas")}
      </p>
      {carregando ? (
        <div className="h-[26px] animate-pulse rounded-md bg-casca-raia" data-testid="trilho-esqueleto" />
      ) : pastas.length === 0 ? (
        <p className="px-2 text-[12px] text-casca-suave">{t("Nenhuma pasta criada")}</p>
      ) : (
        pastas.map((p) =>
          editando === p.id ? (
            <EditorDePasta
              key={p.id}
              inicial={{ nome: p.nome, cor: p.cor, icone: p.icone }}
              salvando={acoes.editar.isPending}
              aoSalvar={(d) => salvarEdicao(p, d)}
              aoCancelar={() => setEditando(null)}
            />
          ) : (
            <Item
              key={p.id}
              ativo={mesmaVisao(visao, { tipo: "pasta", id: p.id })}
              onClick={() => aoMudarVisao({ tipo: "pasta", id: p.id })}
              icone={<IconeDaPasta icone={p.icone} cor={p.cor} />}
              rotulo={p.nome}
              contador={contagens.porPasta[p.id] ?? 0}
              menu={<MenuDaPasta aoRenomear={() => setEditando(p.id)} aoExcluir={() => setExcluindo(p)} />}
            />
          ),
        )
      )}
      {semPasta && (
        <Item
          ativo={visao.tipo === "sem_pasta"}
          onClick={() => aoMudarVisao({ tipo: "sem_pasta" })}
          icone={<FolderOff size={14} aria-hidden />}
          rotulo={t("Sem pasta")}
          contador={contagens.semPasta}
        />
      )}
      <div className="mt-1">
        {criando ? (
          <EditorDePasta
            salvando={acoes.criar.isPending}
            aoSalvar={salvarNova}
            aoCancelar={() => setCriando(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="flex h-[30px] items-center gap-2 px-2 text-[12px] text-casca-marca"
          >
            <FolderPlus size={13} aria-hidden />
            {t("Nova pasta")}
          </button>
        )}
      </div>
      <JanelaDeConfirmacao
        aberta={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        titulo={t("Excluir")}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        ocupado={acoes.excluir.isPending}
        aoConfirmar={confirmarExclusao}
      >
        {t("Excluir esta pasta? As automações dentro dela ficarão sem pasta.")}
      </JanelaDeConfirmacao>
    </nav>
  );
}
