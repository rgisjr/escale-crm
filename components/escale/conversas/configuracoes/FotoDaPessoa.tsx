import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";

/** A inicial colorida de uma pessoa da equipe (c88, c99, c40). O original não guarda foto de usuário. */
export function FotoDaPessoa({
  id,
  nome,
  tamanho = 36,
}: {
  id: string;
  nome: string;
  tamanho?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{
        width: tamanho,
        height: tamanho,
        backgroundColor: corDoAvatar(id),
        fontSize: Math.round(tamanho * 0.42),
      }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
