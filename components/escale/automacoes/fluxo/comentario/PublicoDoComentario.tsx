"use client";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MAXIMO_DO_TEXTO_COM_BOTAO, MAXIMO_DO_TITULO_DO_BOTAO } from "@/lib/escale/comentarios/constantes";
import type { PublicoDoComentario as Publico } from "@/lib/escale/comentarios/schema";
import { publicoPadrao } from "@/lib/escale/comentarios/tela";
import { cn } from "@/lib/utils";

const campoDeTexto =
  "w-full resize-y rounded-[4px] border-0 bg-casca-raia p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca";

function ContadorDoCampo({ valor, limite }: { valor: string; limite: number }) {
  return (
    <span className={cn("text-[10px]", valor.length > limite ? "text-casca-alerta" : "text-casca-suave")}>{`${valor.length}/${limite}`}</span>
  );
}

/**
 * "QUEM RECEBE A MENSAGEM" (fork Escale, Fase 10D, D12/D13): público do gatilho de comentário e o
 * "Siga para liberar". Só no Instagram (o Facebook não informa se a pessoa curte a página).
 * Provisório: não existe na Clint (vem do Zernio/ManyChat).
 */
export function PublicoDoComentario({ publico, aoMudar }: { publico: Publico | null; aoMudar: (p: Publico | null) => void }) {
  const t = useT();
  const atual = publico ?? { ...publicoPadrao(), quem: "todos" as const };
  const mudar = (patch: Partial<Publico>) => aoMudar({ ...(publico ?? publicoPadrao()), ...patch });
  const mudarLiberar = (patch: Partial<Publico["liberar"]>) => mudar({ liberar: { ...atual.liberar, ...patch } });
  const soSeguidores = atual.quem === "seguidores";

  return (
    <div className="flex flex-col gap-2" data-testid="publico-do-comentario">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
        {t("Quem recebe a mensagem")}
        <AjudaDaCasca texto={t("O Instagram informa se a pessoa segue a conta. Quando não informa, vale a opção abaixo.")} />
      </p>
      <SeletorDaCasca
        aria-label={t("Quem recebe a mensagem")}
        aparencia="janela"
        valor={atual.quem}
        aoMudar={(v) => {
          if (!v) return;
          if (v === "todos") return aoMudar(null);
          const base = publico ?? publicoPadrao();
          const naoInformado =
            v === "nao_seguidores" && base.quando_nao_informado === "pedir_para_seguir" ? "nao_enviar" : base.quando_nao_informado;
          aoMudar({ ...base, quem: v as Publico["quem"], quando_nao_informado: naoInformado });
        }}
        opcoes={[
          { valor: "todos", rotulo: t("Todos") },
          { valor: "seguidores", rotulo: t("Só seguidores") },
          { valor: "nao_seguidores", rotulo: t("Só quem não segue") },
        ]}
      />
      {atual.quem !== "todos" ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-casca-suave">{t("Quando o Instagram não informar")}</p>
          <SeletorDaCasca
            aria-label={t("Quando o Instagram não informar")}
            aparencia="janela"
            valor={atual.quando_nao_informado}
            aoMudar={(v) => v && mudar({ quando_nao_informado: v as Publico["quando_nao_informado"] })}
            opcoes={[
              { valor: "enviar", rotulo: t("Enviar mesmo assim") },
              { valor: "nao_enviar", rotulo: t("Não enviar") },
              ...(soSeguidores ? [{ valor: "pedir_para_seguir", rotulo: t("Pedir para seguir") }] : []),
            ]}
          />
        </div>
      ) : null}
      {soSeguidores ? (
        <div className="flex flex-col gap-2 rounded-lg bg-casca-raia p-3">
          <p className="text-[12px] font-semibold text-casca-texto">{t("Siga para liberar")}</p>
          <label htmlFor="liberar-texto" className="text-[12px] text-casca-texto">
            {t("Mensagem para quem ainda não segue")}
          </label>
          <textarea
            id="liberar-texto"
            rows={3}
            value={atual.liberar.texto}
            onChange={(e) => mudarLiberar({ texto: e.target.value })}
            className={campoDeTexto}
          />
          <ContadorDoCampo valor={atual.liberar.texto} limite={MAXIMO_DO_TEXTO_COM_BOTAO} />
          <label htmlFor="liberar-titulo" className="text-[12px] text-casca-texto">
            {t("Título do botão")}
          </label>
          <input
            id="liberar-titulo"
            value={atual.liberar.titulo}
            onChange={(e) => mudarLiberar({ titulo: e.target.value })}
            className="h-9 w-full rounded-[4px] bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden"
          />
          <ContadorDoCampo valor={atual.liberar.titulo} limite={MAXIMO_DO_TITULO_DO_BOTAO} />
          <label htmlFor="liberar-de-novo" className="text-[12px] text-casca-texto">
            {t("Mensagem quando tocar sem seguir")}
          </label>
          <textarea
            id="liberar-de-novo"
            rows={2}
            value={atual.liberar.texto_de_quem_nao_segue}
            onChange={(e) => mudarLiberar({ texto_de_quem_nao_segue: e.target.value })}
            className={campoDeTexto}
          />
          <ContadorDoCampo valor={atual.liberar.texto_de_quem_nao_segue} limite={MAXIMO_DO_TEXTO_COM_BOTAO} />
          <p className="text-[11px] text-casca-suave">
            {t("Quem não segue recebe esta mensagem com o botão. O link sai quando a pessoa seguir e tocar no botão (até 3 toques).")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
