// @vitest-environment node
import { describe, expect, it } from "vitest";

import { caminhoDoAtivo, extensaoDoMime, tipoDaMidia, validarMimeDoAtivo } from "@/lib/midia/ativos";

describe("caminhoDoAtivo", () => {
  it("fica sob a organização e o ativo, sem acento, espaço nem travessia", () => {
    expect(caminhoDoAtivo("org1", "a1", "Áudio de Boas Vindas (1).ogg")).toBe("org1/assets/a1/audio-de-boas-vindas-1.ogg");
    expect(caminhoDoAtivo("org1", "a1", "../../etc/passwd")).toBe("org1/assets/a1/etc-passwd");
  });
  it("nome vazio depois da limpeza vira 'arquivo'", () => {
    expect(caminhoDoAtivo("org1", "a1", "???")).toBe("org1/assets/a1/arquivo");
  });
});

describe("tipoDaMidia", () => {
  it.each([
    ["audio/ogg", "audio"],
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["video/mp4", "video"],
    ["application/pdf", "document"],
  ])("%s -> %s", (mime, tipo) => expect(tipoDaMidia(mime)).toBe(tipo));
});

describe("validarMimeDoAtivo", () => {
  it("áudio só ogg", () => {
    expect(validarMimeDoAtivo("audio/ogg")).toEqual({ ok: true });
    expect(validarMimeDoAtivo("audio/ogg; codecs=opus")).toEqual({ ok: true });
    expect(validarMimeDoAtivo("audio/wav")).toEqual({ ok: false, motivo: "audio_precisa_ser_ogg_opus" });
    expect(validarMimeDoAtivo("audio/mpeg").ok).toBe(false);
  });
  it("imagem, vídeo mp4 e pdf passam; o resto não", () => {
    for (const m of ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]) {
      expect(validarMimeDoAtivo(m)).toEqual({ ok: true });
    }
    expect(validarMimeDoAtivo("application/x-msdownload")).toEqual({ ok: false, motivo: "tipo_nao_aceito" });
  });
});

describe("extensaoDoMime", () => {
  it.each([
    ["audio/ogg", "ogg"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["video/mp4", "mp4"],
    ["application/pdf", "pdf"],
  ])("%s -> %s", (mime, ext) => expect(extensaoDoMime(mime)).toBe(ext));
});
