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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcoesDosGraficos } from "@/hooks/escale/useGraficosDoPainel";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { medidaPorId } from "@/lib/escale/indicadores/catalogo";
import { csvDoResultado, nomeDoCsv } from "@/lib/escale/indicadores/graficos/csv";
import { LINHAS_DA_TABELA_NO_PAINEL, GRAFICOS_POR_PAINEL_MAX, type GraficoDoPainel } from "@/lib/escale/indicadores/graficos/tipos";
import { podeAdicionar } from "@/lib/escale/indicadores/graficos/regras-do-card";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";
import { comVagaNoNavegador } from "@/lib/escale/indicadores/painel/fila-do-navegador";
import { rotaDeEditarChart } from "@/lib/escale/indicadores/rotas";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { Copy, EllipsisVertical, FileSpreadsheet, Pencil, RotateCw, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ROTA_DE_CONSULTA = "/api/v1/indicadores-da-casca/consultar";
const ITEM = cn(ITEM_DO_MENU, "text-[12px]");

/**
 * O ⋮ DO CARD (print 10-009): Exportar dados em CSV, Editar, Duplicar, Recarregar e, depois do divisor,
 * Excluir. Atendente vê só Exportar e Recarregar; o resto é de gerente para cima (R7).
 */
export function MenuDoGrafico({
  grafico,
  pergunta,
  painelId,
  papel,
  total,
  aoRecarregar,
}: {
  grafico: GraficoDoPainel;
  pergunta: Pergunta | null;
  painelId: string;
  papel: Role;
  total: number;
  aoRecarregar: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const { duplicar, excluir } = useAcoesDosGraficos(painelId);
  const [confirmando, setConfirmando] = useState(false);
  const gerente = roleAtLeast(papel, "manager");
  const cabe = podeAdicionar(total);
  const textoDoLimite = t(
    "Você só pode adicionar até {n} charts no seu dashboard. Para incluir novos, será necessário excluir um chart existente.",
  ).replace("{n}", String(GRAFICOS_POR_PAINEL_MAX));
  const falhou = (err: unknown) => (err instanceof ApiError ? showApiError(err) : toast.error(t("Erro inesperado.")));

  async function exportar() {
    if (!pergunta) return toast.error(t("Erro ao exportar dados"));
    try {
      const { data } = await comVagaNoNavegador(() =>
        apiClient.post<{ data: Resultado }>(ROTA_DE_CONSULTA, {
          pergunta: { ...pergunta, limite: LINHAS_DA_TABELA_NO_PAINEL },
          fresco: true,
        }),
      );
      const assunto = medidaPorId(pergunta.indicadores[0] ?? "")?.assunto.nome;
      baixarCsv(nomeDoCsv(grafico.nome, new Date()), csvDoResultado(data, assunto));
      toast.success(data.truncado ? t("Exportados os primeiros 5.000 registros.") : t("Exportação concluída com sucesso!"));
    } catch {
      toast.error(t("Erro ao exportar dados"));
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Opções do chart")}
          className="nao-arrasta grid size-5 place-items-center rounded-[4px] text-casca-suave hover:bg-casca-raia hover:text-casca-texto data-[state=open]:bg-casca-raia"
        >
          <EllipsisVertical size={14} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          className={cn(CONTEUDO_DO_MENU, "min-w-[185px]")}
          style={SOMBRA_DO_MENU}
        >
          <DropdownMenuItem className={ITEM} onSelect={() => void exportar()}>
            <FileSpreadsheet size={14} aria-hidden />
            {t("Exportar dados em CSV")}
          </DropdownMenuItem>
          {gerente ? (
            <DropdownMenuItem className={ITEM} onSelect={() => router.push(rotaDeEditarChart(grafico.id))}>
              <Pencil size={14} aria-hidden />
              {t("Editar")}
            </DropdownMenuItem>
          ) : null}
          {gerente ? (
            <DropdownMenuItem
              className={ITEM}
              disabled={!cabe}
              title={cabe ? undefined : textoDoLimite}
              onSelect={() => duplicar.mutate(grafico.id, { onError: falhou })}
            >
              <Copy size={14} aria-hidden />
              {t("Duplicar")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className={ITEM} onSelect={aoRecarregar}>
            <RotateCw size={14} aria-hidden />
            {t("Recarregar")}
          </DropdownMenuItem>
          {gerente ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={cn(ITEM, "text-casca-alerta focus:text-casca-alerta")} onSelect={() => setConfirmando(true)}>
                <Trash2 size={14} aria-hidden />
                {t("Excluir")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo={t("Excluir chart")}
        perigo
        rotuloDoConfirmar={t("Excluir")}
        aoConfirmar={() => excluir.mutate(grafico.id, { onSuccess: () => setConfirmando(false), onError: falhou })}
        ocupado={excluir.isPending}
      >
        <p>{t("Tem certeza que deseja excluir o chart?")}</p>
      </JanelaDeConfirmacao>
    </>
  );
}
