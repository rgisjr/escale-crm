import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/auth/public-paths";

/**
 * O app travado que o Docker chamava de "healthy" (29/10/2026).
 *
 * O processo do Next ficou com a CPU em 100% e parou de responder por quase uma
 * hora. O healthcheck só abria um socket na porta 3000 — quem aceita a conexão
 * é o kernel, não o laço de eventos —, então o contêiner seguia "healthy" e
 * ninguém o reiniciava. E mesmo "unhealthy" não bastaria: o Compose (fora do
 * Swarm) não reinicia contêiner doente, só contêiner que saiu.
 *
 * O desenho: a sonda pede uma resposta HTTP de verdade; depois de N falhas
 * seguidas ela derruba o servidor com SIGKILL (um laço preso não roda handler
 * de SIGTERM), o `init` do contêiner sai junto e o `restart: unless-stopped`
 * traz o app de volta.
 */

const require = createRequire(import.meta.url);
const vigia = require(path.join(process.cwd(), "docker/app/vigia.cjs")) as {
  FALHAS_PARA_DERRUBAR: number;
  proximoEstado: (falhasAntes: number, respondeu: boolean) => { falhas: number; derrubar: boolean };
};

describe("vigia do app: quando derrubar o servidor", () => {
  it("resposta boa zera a contagem e não derruba", () => {
    expect(vigia.proximoEstado(3, true)).toEqual({ falhas: 0, derrubar: false });
  });

  it("falhas abaixo do limite só contam", () => {
    expect(vigia.proximoEstado(0, false)).toEqual({ falhas: 1, derrubar: false });
    expect(vigia.proximoEstado(vigia.FALHAS_PARA_DERRUBAR - 2, false).derrubar).toBe(false);
  });

  it("a falha que atinge o limite derruba", () => {
    const estado = vigia.proximoEstado(vigia.FALHAS_PARA_DERRUBAR - 1, false);
    expect(estado.derrubar).toBe(true);
  });

  it("contagem ilegível vale como zero", () => {
    expect(vigia.proximoEstado(Number.NaN, false)).toEqual({ falhas: 1, derrubar: false });
  });
});

describe("a sonda de vida não depende de nada além do próprio app", () => {
  it("a rota é pública (o proxy não vai ao Supabase para ela)", () => {
    expect(isPublicPath("/api/v1/health/vivo")).toBe(true);
  });

  it("a rota não importa cliente de banco, fila nem env", () => {
    const rota = readFileSync("app/api/v1/health/vivo/route.ts", "utf8");
    expect(rota).not.toMatch(/supabase|redis|@\/lib\/env|fetch\(/i);
  });

  it("a vigia bate na rota de vida", () => {
    const script = readFileSync("docker/app/vigia.cjs", "utf8");
    expect(script).toContain("/api/v1/health/vivo");
  });
});

describe("docker-compose.prod.yml: o app reinicia quando trava", () => {
  // Só o bloco do serviço `app` (até o serviço seguinte, `worker`).
  const compose = readFileSync("docker-compose.prod.yml", "utf8");
  const app = compose.slice(compose.indexOf("\n  app:\n"), compose.indexOf("\n  worker:\n"));

  it("o healthcheck é a vigia, não o socket TCP", () => {
    expect(app).toContain('test: ["CMD", "node", "vigia.cjs"]');
    expect(app).not.toContain("require('net').connect");
  });

  it("tem init (o servidor deixa de ser o PID 1 e pode ser derrubado de dentro)", () => {
    expect(app).toMatch(/^    init: true$/m);
  });

  it("volta sozinho depois de sair", () => {
    expect(app).toMatch(/^    restart: unless-stopped$/m);
  });

  it("a imagem do app leva a vigia", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    expect(dockerfile).toMatch(/COPY .*docker\/app\/vigia\.cjs \.\/vigia\.cjs/);
  });
});
