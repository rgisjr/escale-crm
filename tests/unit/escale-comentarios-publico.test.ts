import { describe, expect, it } from "vitest";

import { PREFIXO_DO_LIBERAR } from "@/lib/escale/comentarios/constantes";
import { decisaoDoPublico, disparoDoLiberar, payloadDoLiberar } from "@/lib/escale/comentarios/publico";
import type { PublicoDoComentario } from "@/lib/escale/comentarios/schema";

const liberar = { texto: "t", titulo: "ti", texto_de_quem_nao_segue: "n" };
const pub = (
  quem: PublicoDoComentario["quem"],
  quando: PublicoDoComentario["quando_nao_informado"] = "enviar",
): PublicoDoComentario => ({ quem, quando_nao_informado: quando, liberar });

describe("decisaoDoPublico", () => {
  it("null e 'todos' enviam", () => {
    expect(decisaoDoPublico(null, "instagram", false)).toBe("enviar");
    expect(decisaoDoPublico(pub("todos"), "instagram", null)).toBe("enviar");
  });

  it("Facebook sempre envia", () => {
    expect(decisaoDoPublico(pub("seguidores"), "facebook", false)).toBe("enviar");
  });

  it("seguidores", () => {
    expect(decisaoDoPublico(pub("seguidores"), "instagram", true)).toBe("enviar");
    expect(decisaoDoPublico(pub("seguidores"), "instagram", false)).toBe("pedir_para_seguir");
    expect(decisaoDoPublico(pub("seguidores", "enviar"), "instagram", null)).toBe("enviar");
    expect(decisaoDoPublico(pub("seguidores", "nao_enviar"), "instagram", null)).toBe("fora_do_publico");
    expect(decisaoDoPublico(pub("seguidores", "pedir_para_seguir"), "instagram", null)).toBe("pedir_para_seguir");
  });

  it("não seguidores", () => {
    expect(decisaoDoPublico(pub("nao_seguidores"), "instagram", true)).toBe("fora_do_publico");
    expect(decisaoDoPublico(pub("nao_seguidores"), "instagram", false)).toBe("enviar");
    expect(decisaoDoPublico(pub("nao_seguidores", "enviar"), "instagram", null)).toBe("enviar");
    expect(decisaoDoPublico(pub("nao_seguidores", "nao_enviar"), "instagram", null)).toBe("fora_do_publico");
    expect(decisaoDoPublico(pub("nao_seguidores", "pedir_para_seguir"), "instagram", null)).toBe("fora_do_publico");
  });
});

describe("payload do liberar", () => {
  const id = "e5ca1e00-9804-4000-8000-000000000001";
  it("ida e volta", () => {
    expect(payloadDoLiberar(id)).toBe(`${PREFIXO_DO_LIBERAR}${id}`);
    expect(disparoDoLiberar(payloadDoLiberar(id))).toBe(id);
  });
  it("sem prefixo ou com lixo → null", () => {
    expect(disparoDoLiberar(id)).toBeNull();
    expect(disparoDoLiberar(`${PREFIXO_DO_LIBERAR}lixo`)).toBeNull();
    expect(disparoDoLiberar(null)).toBeNull();
    expect(disparoDoLiberar(undefined)).toBeNull();
  });
});
