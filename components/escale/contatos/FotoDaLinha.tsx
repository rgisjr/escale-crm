"use client";
import { useState } from "react";

import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";

/** FORK ESCALE · Fase 2E: a mesma foto na linha (32px), na conversa e na janela do contato (40px). */
const MEDIDA = { linha: "size-8 text-[13px]", conversa: "size-10 text-[15px]", ficha: "size-10 text-[15px]" } as const;

/** A foto redonda da linha (03-001); sem foto, a inicial na cor do contato. */
export function FotoDaLinha({
  id,
  nome,
  temFoto,
  tamanho = "linha",
}: {
  id: string;
  nome: string;
  temFoto: boolean;
  tamanho?: keyof typeof MEDIDA;
}) {
  const [falhou, setFalhou] = useState(false);
  if (temFoto && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a rota de avatar devolve um redirect assinado
      <img
        src={`/api/v1/contacts/${id}/avatar`}
        alt=""
        className={`${MEDIDA[tamanho].split(" ")[0]} shrink-0 rounded-full object-cover`}
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid ${MEDIDA[tamanho]} shrink-0 place-items-center rounded-full font-medium text-white`}
      style={{ backgroundColor: corDoAvatar(id) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
