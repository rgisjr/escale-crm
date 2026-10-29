/**
 * Healthcheck do contêiner do app — e o que faz o app voltar quando trava.
 *
 * Em 29/10/2026 o processo do Next ficou com a CPU em 100% e parou de responder
 * por quase uma hora com o contêiner "healthy": a sonda antiga só abria um
 * socket na porta 3000, e quem aceita a conexão é o kernel, não o laço de
 * eventos. Esta sonda pede uma resposta HTTP de verdade a uma rota que não
 * depende de banco, fila nem WhatsApp (`/api/v1/health/vivo`) — de propósito:
 * Supabase lento não é motivo para reiniciar o app.
 *
 * "unhealthy" sozinho não basta: o Compose (fora do Swarm) não reinicia
 * contêiner doente, só contêiner que saiu. Por isso, depois de
 * FALHAS_PARA_DERRUBAR sondas seguidas sem resposta, a vigia manda SIGKILL ao
 * servidor. Tem de ser SIGKILL: o laço preso não roda o handler de SIGTERM do
 * Next. Com `init: true` no compose o servidor não é o PID 1, o `docker-init`
 * sai quando ele morre e o `restart: unless-stopped` traz o app de volta.
 * `kill(-1)` atinge todo processo deste usuário no contêiner menos o PID 1 e a
 * própria vigia; sem `init`, o servidor É o PID 1 e nada acontece (a sonda só
 * fica vermelha, como antes).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- roda com `node` puro na imagem, sem build: CommonJS.
const fs = require("node:fs");

const URL_DE_VIDA = "http://127.0.0.1:3000/api/v1/health/vivo";
const PRAZO_MS = 8_000;
const FALHAS_PARA_DERRUBAR = 4; // com interval 30s: ~2 min parado
const ARQUIVO_DE_FALHAS = "/tmp/vigia-falhas";

function proximoEstado(falhasAntes, respondeu) {
  if (respondeu) return { falhas: 0, derrubar: false };
  const falhas = (Number.isFinite(falhasAntes) ? falhasAntes : 0) + 1;
  return { falhas, derrubar: falhas >= FALHAS_PARA_DERRUBAR };
}

function lerFalhas() {
  try {
    return Number.parseInt(fs.readFileSync(ARQUIVO_DE_FALHAS, "utf8"), 10);
  } catch {
    return 0;
  }
}

async function respondeu() {
  try {
    const resposta = await fetch(URL_DE_VIDA, { signal: AbortSignal.timeout(PRAZO_MS) });
    return resposta.ok;
  } catch {
    return false;
  }
}

async function main() {
  const estado = proximoEstado(lerFalhas(), await respondeu());
  try {
    fs.writeFileSync(ARQUIVO_DE_FALHAS, String(estado.derrubar ? 0 : estado.falhas));
  } catch (erro) {
    console.error(`[vigia] não consegui gravar ${ARQUIVO_DE_FALHAS}: ${erro.message}`);
  }
  if (estado.derrubar) {
    console.error(`[vigia] ${estado.falhas} sondas seguidas sem resposta — derrubando o servidor para o contêiner reiniciar`);
    try {
      process.kill(-1, "SIGKILL");
    } catch (erro) {
      console.error(`[vigia] não consegui derrubar o servidor: ${erro.message}`);
    }
  }
  process.exit(estado.falhas === 0 ? 0 : 1);
}

if (require.main === module) {
  void main();
}

module.exports = { FALHAS_PARA_DERRUBAR, proximoEstado };
