"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { usePedirAcaoEmMassa } from "@/hooks/escale/useAcoesEmMassa";
import { useT } from "@/hooks/i18n/useT";
import type { AlvoDaAcao } from "@/lib/escale/contatos/selecao";
import type { AcaoEmMassa, PedidoDeAcao } from "@/lib/escale/massa/tipos";

import type { CampoDeColuna } from "@/lib/escale/contatos/regras";

import type { OrigemParaCriar } from "../CamposDaOportunidade";
import { BOTAO_DA_BARRA_DE_LOTE, BarraDeLote } from "./BarraDeLote";
import { JanelaCriarNegocios, type NovoNegocioEmMassa } from "./JanelaCriarNegocios";
import { JanelaExcluirContatos } from "./JanelaExcluirContatos";
import { PainelDeCampos } from "./PainelDeCampos";
import { PainelDeTag } from "./PainelDeTag";
import { avisoNaFila, falhaDoPedido } from "./textosDasAcoes";

type Janela = "negocio" | "exportar" | "excluir" | null;

/**
 * AS AÇÕES EM MASSA DA LISTA (fork Escale, Fase 2B): a barra e as janelas. Todo
 * pedido vai para a fila (`POST /api/v1/acoes-em-massa`); aqui só o toast da
 * Clint "na fila" (ou o de "enviada para aprovação", na exportação, Q4), a seleção
 * limpa e o id entregue a quem acompanha o fim.
 */
export function AcoesEmMassa({
  quantidade,
  alvo,
  origens,
  camposDoContato,
  aoLimpar,
  aoPedir,
}: {
  quantidade: number;
  alvo: AlvoDaAcao;
  origens: OrigemParaCriar[];
  /** Fase 2C: os campos do catálogo do contato (rótulo e tipo) para o painel "Campos". */
  camposDoContato: CampoDeColuna[];
  aoLimpar: () => void;
  aoPedir: (id: string, acao: AcaoEmMassa) => void;
}) {
  const t = useT();
  const pedir = usePedirAcaoEmMassa();
  const [janela, setJanela] = useState<Janela>(null);

  async function enviar(acao: AcaoEmMassa, parametros: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await pedir.mutateAsync({
        lista: "contatos",
        acao,
        alvo,
        parametros,
      } as PedidoDeAcao);
      const aviso = avisoNaFila(t, acao, r.total, r.status);
      if (aviso) toast.success(aviso);
      aoPedir(r.id, acao);
      setJanela(null);
      aoLimpar();
      return true;
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : falhaDoPedido(t, acao));
      return false;
    }
  }

  return (
    <>
      <BarraDeLote
        quantidade={quantidade}
        aoLimpar={aoLimpar}
        aoCriarNegocio={() => setJanela("negocio")}
        painelDeCampos={
          <PainelDeCampos
            classeDoGatilho={BOTAO_DA_BARRA_DE_LOTE}
            camposDoContato={camposDoContato}
            aoAplicar={(acao, parametros) => enviar(acao, parametros)}
          />
        }
        painelDeTag={
          <PainelDeTag
            classeDoGatilho={BOTAO_DA_BARRA_DE_LOTE}
            aoAplicar={(acao, tag) => enviar(acao, { tag })}
          />
        }
        aoExportar={() => setJanela("exportar")}
        aoExcluir={() => setJanela("excluir")}
      />
      <JanelaCriarNegocios
        aberta={janela === "negocio"}
        quantidade={quantidade}
        origens={origens}
        enviando={pedir.isPending}
        aoFechar={() => setJanela(null)}
        aoConfirmar={(novo: NovoNegocioEmMassa) => void enviar("criar_negocios", novo)}
      />
      <JanelaDeConfirmacao
        aberta={janela === "exportar"}
        aoFechar={() => setJanela(null)}
        ocupado={pedir.isPending}
        aoConfirmar={() => void enviar("exportar", {})}
      >
        <p>
          {t("Tem certeza que deseja exportar {n} contatos?").replace(
            "{n}",
            quantidade.toLocaleString("pt-BR"),
          )}
        </p>
      </JanelaDeConfirmacao>
      <JanelaExcluirContatos
        aberta={janela === "excluir"}
        quantidade={quantidade}
        enviando={pedir.isPending}
        aoFechar={() => setJanela(null)}
        aoConfirmar={() => void enviar("excluir", {})}
      />
    </>
  );
}
