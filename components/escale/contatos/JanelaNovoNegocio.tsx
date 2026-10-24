"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { ContatoParaNegocio } from "./ficha/JanelaDoContato";
import { formatarTelefone } from "@/lib/escale/contatos/regras";

import { CamposDaOportunidade, type OrigemParaCriar } from "./CamposDaOportunidade";

/** "Adicionar negócio" da linha (Clint `bt-add-deal-row` → `DealAddModal`): origem e etapa, título = nome do contato. */
export function JanelaNovoNegocio({
  contato,
  aoFechar,
  origens,
}: {
  contato: ContatoParaNegocio | null;
  aoFechar: () => void;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const qc = useQueryClient();
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [gravando, setGravando] = useState(false);
  const fechar = () => {
    setDestino({ origemId: "", etapaId: "" });
    aoFechar();
  };
  const titulo = contato
    ? (nomeDoContato({
        name: contato.nome,
        display_name: contato.display_name,
        phone_number: contato.telefone,
      }) ?? formatarTelefone(contato.telefone))
    : "";

  async function criar() {
    if (!contato || !destino.origemId || !destino.etapaId) return;
    setGravando(true);
    try {
      const negocio = await apiClient.post<{ data: { id: string } }>("/api/v1/leads", {
        pipeline_id: destino.origemId,
        stage_id: destino.etapaId,
        title: titulo.length >= 2 ? titulo : t("Novo negócio"),
        contact_id: contato.id,
        source: "manual",
      });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("Negócio criado."), {
        description: (
          <Link href={`/app/leads/${negocio.data.id}`} className="font-medium underline">
            {t("Ver novo negócio")}
          </Link>
        ),
      });
      fechar();
    } catch {
      toast.error(t("Não foi possível criar o negócio."));
    } finally {
      setGravando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={contato !== null} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Novo negócio")} descricao={titulo} />
      <div className="grid gap-4">
        <CamposDaOportunidade
          origens={origens}
          origemId={destino.origemId}
          etapaId={destino.etapaId}
          aoMudar={setDestino}
        />
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="salvar"
          onClick={() => void criar()}
          disabled={gravando || !destino.etapaId}
        >
          {t("Criar negócio")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
