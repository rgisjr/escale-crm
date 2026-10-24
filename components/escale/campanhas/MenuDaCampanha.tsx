"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcoesDaCampanha, type PedidoDeAcao } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import {
  ACOES_DESTRUTIVAS,
  CONFIRMACAO_DA_ACAO,
  ROTULO_DA_ACAO,
  acoesDaLinha,
  type AcaoConfirmavel,
  type AcaoDaLinha,
} from "@/lib/escale/campanhas/acoes-da-linha";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { CircleX, Clock, Copy, EllipsisVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaAlterarHorario } from "./JanelaAlterarHorario";

const ICONE: Record<AcaoDaLinha, typeof Copy> = {
  editar: Pencil,
  excluir: Trash2,
  alterar_horario: Clock,
  cancelar_para_rascunho: CircleX,
  cancelar: CircleX,
  duplicar: Copy,
};

/**
 * O ⋮ DA CAMPANHA (007; material 2.1; N9): abre em cima à direita; os itens do
 * status; cancelar e excluir pedem a confirmação da Clint. `modal={false}`: a
 * janela que o item abre não pode herdar o bloqueio de clique do menu.
 */
export function MenuDaCampanha({ linha }: { linha: LinhaDeCampanha }) {
  const t = useT();
  const router = useRouter();
  const acao = useAcoesDaCampanha();
  const [confirmando, setConfirmando] = useState<AcaoConfirmavel | null>(null);
  const [reagendando, setReagendando] = useState(false);
  const falhou = (texto: string) => (err: unknown) =>
    err instanceof ApiError ? showApiError(err) : toast.error(texto);

  function duplicar() {
    toast(t("A campanha está sendo duplicada, aguarde a finalização."));
    acao.mutate(
      { id: linha.id, acao: "duplicar" },
      {
        onSuccess: (r) => {
          if (typeof r.id === "string") router.push(rotaDoRascunho(r.id));
        },
        onError: falhou(t("Não foi possível duplicar a campanha. Tente novamente.")),
      },
    );
  }

  function escolher(a: AcaoDaLinha) {
    if (a === "editar") router.push(rotaDoRascunho(linha.id));
    else if (a === "alterar_horario") setReagendando(true);
    else if (a === "duplicar") duplicar();
    else setConfirmando(a);
  }

  function confirmar() {
    if (!confirmando) return;
    const pedido: PedidoDeAcao = {
      id: linha.id,
      acao:
        confirmando === "excluir"
          ? "excluir"
          : confirmando === "cancelar"
            ? "cancelar"
            : "rascunho",
    };
    const sucesso =
      confirmando === "excluir"
        ? t("Rascunho excluído com sucesso!")
        : confirmando === "cancelar"
          ? t("Campanha cancelada com sucesso!")
          : t("Agendamento cancelado. A campanha foi movida para Rascunho.");
    const falha =
      confirmando === "excluir"
        ? t("Não foi possível excluir o rascunho. Tente novamente.")
        : t("Falha ao cancelar");
    acao.mutate(pedido, {
      onSuccess: () => {
        toast.success(sucesso);
        setConfirmando(null);
      },
      onError: falhou(falha),
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Mais opções")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto"
        >
          <EllipsisVertical size={18} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          className={CONTEUDO_DO_MENU}
          style={SOMBRA_DO_MENU}
        >
          {acoesDaLinha(linha.status, linha.enviados).map((a) => {
            const Icone = ICONE[a];
            return (
              <DropdownMenuItem
                key={a}
                className={cn(
                  ITEM_DO_MENU,
                  ACOES_DESTRUTIVAS.has(a) && "text-casca-alerta focus:text-casca-alerta",
                )}
                onSelect={() => escolher(a)}
              >
                <Icone size={14} aria-hidden />
                {t(ROTULO_DA_ACAO[a])}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        perigo
        rotuloDoConfirmar={confirmando ? t(ROTULO_DA_ACAO[confirmando]) : undefined}
        aoConfirmar={confirmar}
        ocupado={acao.isPending}
      >
        <p>{confirmando ? t(CONFIRMACAO_DA_ACAO[confirmando]) : null}</p>
      </JanelaDeConfirmacao>
      {reagendando ? (
        <JanelaAlterarHorario linha={linha} aoFechar={() => setReagendando(false)} />
      ) : null}
    </>
  );
}
