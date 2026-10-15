"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCriarFiltroSalvo, useMudarFiltroSalvo } from "@/hooks/escale/useFiltrosSalvos";
import { useT } from "@/hooks/i18n/useT";
import {
  NOME_DO_FILTRO_MAX,
  nomeRepetido,
  validarNomeDoFiltro,
  type AlvoDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import { enxugar, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { randomId } from "@/lib/random-id";

import { Caixinha } from "./controles";

export type JanelaDoFiltro = { modo: "novo" } | { modo: "editar"; filtro: FiltroSalvo };

interface Props {
  alvo: AlvoDoFiltro;
  janela: JanelaDoFiltro | null;
  /** Os filtros na tela agora: é o que "Salvar filtro" guarda. */
  filtros: FiltrosDoQuadro;
  meus: readonly FiltroSalvo[];
  onFechar: () => void;
  /** Depois de salvar um novo: a barra já o marca como aplicado. */
  onSalvo: (id: string, criterios: FiltrosDoQuadro) => void;
}

/**
 * SALVAR E EDITAR UM FILTRO (fork Escale, Fase 1D): nome e a caixinha
 * "compartilhar" (decisão de 15/10). Editar muda nome e compartilhamento; os
 * critérios mudam pelo "Salvar alterações neste filtro" do menu.
 */
export function JanelaDoFiltroSalvo({ janela, ...resto }: Props) {
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberta) => {
        if (!aberta) resto.onFechar();
      }}
    >
      <DialogContent className="max-w-md">
        {janela ? <FormDoFiltro key={janela.modo === "editar" ? janela.filtro.id : "novo"} janela={janela} {...resto} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormDoFiltro({ alvo, janela, filtros, meus, onFechar, onSalvo }: Omit<Props, "janela"> & { janela: JanelaDoFiltro }) {
  const t = useT();
  const criar = useCriarFiltroSalvo(alvo);
  const mudar = useMudarFiltroSalvo(alvo);
  const atual = janela.modo === "editar" ? janela.filtro : null;
  // O id nasce aqui para a barra marcar o filtro como aplicado assim que a rota responder.
  const [id] = useState(() => atual?.id ?? randomId());
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [compartilhado, setCompartilhado] = useState(atual?.compartilhado ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const pendente = criar.isPending || mudar.isPending;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const validado = validarNomeDoFiltro(nome);
    if (!validado.ok) {
      setErro(t(validado.erro));
      return;
    }
    if (nomeRepetido(validado.nome, meus, atual?.id)) {
      setErro(t("Você já tem um filtro com esse nome aqui."));
      return;
    }
    const aoErrar = (err: unknown) => setErro(textoDoErro(err, t));
    if (atual) {
      mudar.mutate(
        { id: atual.id, mudanca: { nome: validado.nome, compartilhado } },
        {
          onSuccess: () => {
            toast.success(t("Filtro atualizado."));
            onFechar();
          },
          onError: aoErrar,
        },
      );
      return;
    }
    // O painel emite filtros com seções "abertas e vazias": o que se guarda é o enxuto.
    const criterios = enxugar(filtros);
    criar.mutate(
      { id, nome: validado.nome, compartilhado, criterios },
      {
        onSuccess: () => {
          toast.success(t("Filtro salvo."));
          onSalvo(id, criterios);
          onFechar();
        },
        onError: aoErrar,
      },
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{atual ? t("Editar filtro salvo") : t("Salvar filtro")}</DialogTitle>
        <DialogDescription>
          {atual
            ? t("O nome e quem vê. Para mudar os critérios, aplique o filtro, ajuste e use “Salvar alterações neste filtro”.")
            : t("Salva os filtros, o status e a ordenação que estão na tela agora.")}
        </DialogDescription>
      </DialogHeader>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{t("Nome do filtro")}</span>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={t("Ex.: Clientes em aberto")}
          maxLength={NOME_DO_FILTRO_MAX}
          autoFocus
        />
      </label>
      <div className="space-y-1">
        <Caixinha marcada={compartilhado} onMudar={setCompartilhado}>
          {alvo.tipo === "origem" ? t("Compartilhar com quem vê esta origem") : t("Compartilhar com quem vê esta visualização")}
        </Caixinha>
        <p className="text-xs text-muted-foreground">{t("Filtro compartilhado aparece para quem tem acesso. Só você muda ou exclui.")}</p>
      </div>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={pendente}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}
