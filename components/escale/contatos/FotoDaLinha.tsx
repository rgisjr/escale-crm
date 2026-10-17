"use client";
import { useState } from "react";

import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";

/** A foto redonda de 32px da linha (03-001); sem foto, a inicial na cor do contato. */
export function FotoDaLinha({ id, nome, temFoto }: { id: string; nome: string; temFoto: boolean }) {
  const [falhou, setFalhou] = useState(false);
  if (temFoto && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a rota de avatar devolve um redirect assinado
      <img
        src={`/api/v1/contacts/${id}/avatar`}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-medium text-white"
      style={{ backgroundColor: corDoAvatar(id) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
