"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmojiButton } from "@/components/inbox/composer/EmojiButton";
import {
  BotaoDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useSalvarResposta } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import {
  respostaSchema,
  type CanalDaResposta,
  type RespostaLida,
} from "@/lib/escale/conversas/respostas";
import {
  AlertTriangle,
  Braces,
  Camera,
  Check,
  Gift,
  MessageCircle,
  Mic,
  Paperclip,
  PlusCircle,
  X,
} from "@/lib/ui/icons-da-casca";
import { InstagramLogo } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

const TODOS = "todos";
const ICONE_EM_BREVE = "grid size-7 place-items-center rounded-casca-gatilho text-casca-meta";

/**
 * "CRIAR / EDITAR RESPOSTA RÁPIDA" (c96; E6; N14). Uma mensagem por resposta;
 * emoji e variáveis funcionam; GIF, anexo, câmera, áudio e "+ Adicionar"
 * ficam "Em breve". "Compartilhar" exige gerente ou a exceção da Clint.
 */
export function JanelaRespostaRapida({
  aberta,
  aoFechar,
  resposta,
}: {
  aberta: boolean;
  aoFechar: () => void;
  resposta: RespostaLida | null;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const minhas = useMinhasPermissoes();
  const podeCompartilhar =
    roleAtLeast(activeOrg?.role, "manager") || minhas.CHAT_SHARE_QUICK_RESPONSE === true;
  const { data: setores = [] } = useSetores();
  const salvar = useSalvarResposta();
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const [corpo, setCorpo] = useState("");
  const [atalho, setAtalho] = useState("");
  const [canais, setCanais] = useState<CanalDaResposta[]>(["whatsapp", "instagram"]);
  const [compartilhar, setCompartilhar] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([TODOS]);
  useEffect(() => {
    if (!aberta) return;
    setCorpo(resposta?.corpo ?? "");
    setAtalho(resposta?.atalho ?? "");
    setCanais(resposta?.canais ?? ["whatsapp", "instagram"]);
    setCompartilhar(resposta?.compartilhada ?? false);
    setEscolhidos(resposta && !resposta.todos_os_setores ? resposta.setores : [TODOS]);
  }, [aberta, resposta]);

  const inserir = (trecho: string) => {
    const el = campoRef.current;
    const ini = el?.selectionStart ?? corpo.length;
    const fim = el?.selectionEnd ?? corpo.length;
    setCorpo(corpo.slice(0, ini) + trecho + corpo.slice(fim));
  };
  const alternarCanal = (c: CanalDaResposta) =>
    setCanais((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  const todos = escolhidos.length === 0 || escolhidos.includes(TODOS);
  const nova = {
    atalho: atalho.trim().replace(/^\/+/, ""),
    corpo: corpo.trim(),
    canais,
    compartilhar,
    todos_os_setores: todos,
    setores: todos ? [] : escolhidos,
  };
  const valida = respostaSchema.safeParse(nova).success;

  const confirmar = async () => {
    if (!valida) return;
    await salvar.mutateAsync({ ...(resposta ? { id: resposta.id } : {}), ...nova });
    toast.success(resposta ? t("Resposta rápida atualizada.") : t("Resposta rápida criada."));
    aoFechar();
  };

  const botaoDoCanal = (canal: CanalDaResposta, rotulo: string, icone: React.ReactNode) => (
    <button
      key={canal}
      type="button"
      role="checkbox"
      aria-checked={canais.includes(canal)}
      aria-label={rotulo}
      onClick={() => alternarCanal(canal)}
      className={cn(
        "relative grid size-7 place-items-center rounded-md bg-casca-raia",
        canais.includes(canal) && "bg-casca-marca-suave",
      )}
    >
      {icone}
      {canais.includes(canal) ? (
        <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-casca-novo text-white">
          <Check size={9} aria-hidden />
        </span>
      ) : null}
    </button>
  );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[672px] p-0">
      <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
        <span className="text-[15px] text-casca-texto">
          {resposta ? t("Editar Resposta rápida") : t("Criar Resposta rápida")}
        </span>
        <button
          type="button"
          aria-label={t("Fechar")}
          onClick={aoFechar}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="flex max-h-[560px] flex-col gap-5 overflow-y-auto px-6 py-5">
        <p className="flex items-center gap-2 rounded-md border border-casca-pausa-texto/40 bg-casca-pausa px-3 py-2 text-[13px] font-semibold text-casca-pausa-texto">
          <AlertTriangle size={18} aria-hidden />
          {t("Você pode criar respostas rápidas para utilizar no chat de atendimento")}
        </p>
        <div className="rounded-md shadow-casca-painel">
          <textarea
            ref={campoRef}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder={t("Escreva uma mensagem...")}
            aria-label={t("Mensagem")}
            className="h-24 w-full resize-none rounded-t-md bg-white px-3 py-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <div className="flex h-10 items-center gap-1 border-t border-casca-borda px-2">
            <EmojiButton onPick={inserir} />
            <span title={t("Em breve")} className={ICONE_EM_BREVE}>
              <Gift size={16} aria-hidden />
            </span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}>
              <Paperclip size={16} aria-hidden />
            </span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}>
              <Camera size={16} aria-hidden />
            </span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}>
              <Mic size={16} aria-hidden />
            </span>
            <SeletorDeVariaveis
              aoEscolher={inserir}
              gatilho={
                <button
                  type="button"
                  aria-label={t("Variáveis")}
                  title={t("Variáveis")}
                  className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
                >
                  <Braces size={16} aria-hidden />
                </button>
              }
            />
            <span className="flex-1" />
            <span
              title={t("Em breve")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-casca-marca/60 px-3 text-[13px] font-medium text-white"
            >
              <PlusCircle size={16} aria-hidden />
              {t("Adicionar")}
            </span>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-[15px] text-casca-texto">
          {t("Atalho")}
          <input
            value={atalho}
            onChange={(e) => setAtalho(e.target.value)}
            placeholder={t("Digite o atalho")}
            maxLength={60}
            className="h-9 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] outline-hidden placeholder:text-casca-meta"
          />
        </label>
        <div className="flex items-center gap-3 text-[15px] text-casca-texto">
          {t("Utilizar em:")}
          {botaoDoCanal(
            "whatsapp",
            "WhatsApp",
            <MessageCircle size={16} aria-hidden className="text-casca-texto" />,
          )}
          {botaoDoCanal(
            "instagram",
            "Instagram",
            <InstagramLogo size={16} aria-hidden className="text-casca-texto" />,
          )}
        </div>
        <label
          className={cn(
            "flex items-center gap-2 text-[14px] text-casca-texto",
            !podeCompartilhar && "opacity-50",
          )}
          title={podeCompartilhar ? undefined : t("Você não pode compartilhar respostas rápidas.")}
        >
          <input
            type="checkbox"
            checked={compartilhar}
            disabled={!podeCompartilhar}
            onChange={(e) => setCompartilhar(e.target.checked)}
            aria-label={t("Compartilhar com outros usuários")}
            className="size-5 accent-[color:var(--color-casca-novo)]"
          />
          {t("Compartilhar com outros usuários")}
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-casca-texto">{t("Setores")}</span>
          <div className="w-[190px]">
            <SeletorMultiploDaCasca
              valores={escolhidos}
              opcoes={[
                { valor: TODOS, rotulo: t("Todos os setores") },
                ...setores.map((s) => ({ valor: s.id, rotulo: s.nome })),
              ]}
              exclusiva={TODOS}
              aoMudar={(v) => setEscolhidos(v.length === 0 ? [TODOS] : v)}
              vazio={t("Todos os setores")}
              aria-label={t("Setores")}
            />
          </div>
          <span className="text-[13px] text-casca-suave">
            {t(
              "A resposta ficará disponível para os usuários ao atender conversas destes setores.",
            )}
          </span>
        </div>
      </div>
      <div className="px-6 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={!valida || salvar.isPending}
            onClick={() => void confirmar()}
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
