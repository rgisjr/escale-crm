"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA_PROSPECCAO } from "@/lib/escale/prospeccao/rotas";
import { Building2, Settings } from "@/lib/ui/icons-da-casca";

import { BotaoDaChave } from "./BotaoDaChave";

/** O molde do vazio (014): quadrado 56px, título 15px/600, texto 13px em coluna estreita. */
function Vazio({
  icone,
  titulo,
  texto,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-[10px] bg-casca-marca-suave text-casca-marca">
        {icone}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-casca-texto">{titulo}</p>
      <p className="mt-2 max-w-[260px] text-[13px] text-casca-suave">{texto}</p>
      {children}
    </div>
  );
}

export function VazioSemChave() {
  const t = useT();
  return (
    <Vazio
      icone={<Settings size={24} aria-hidden />}
      titulo={t("Configure a chave de busca")}
      texto={t(
        "A prospecção busca empresas no Google Maps pela Apify. Salve a chave da sua conta para começar.",
      )}
    >
      <BotaoDaChave forma="contorno" />
    </Vazio>
  );
}

export function VazioSemProspeccoes() {
  const t = useT();
  return (
    <Vazio
      icone={<Building2 size={24} aria-hidden />}
      titulo={t("Crie sua primeira prospecção")}
      texto={t("Encontre empresas fora do CRM e deixe um agente de IA fazer a primeira abordagem.")}
    >
      <Link
        href={ROTA_DA_NOVA_PROSPECCAO}
        className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        {t("Nova prospecção")}
      </Link>
    </Vazio>
  );
}
