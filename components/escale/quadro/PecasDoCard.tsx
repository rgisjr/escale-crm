"use client";
import Link from "next/link";
import type { MouseEvent } from "react";

// Fase 1F: o tempo na etapa vira a pílula do alerta quando a origem tem regra.
import { PrazoDoCard } from "@/components/escale/configuracoes/PilulaDoPrazo";
import { AbrirConversaDoLead, temAlvoParaAbrir } from "@/components/kanban/AbrirConversaDoLead";
import { useCorDaEtiqueta } from "@/components/tags/CoresDasEtiquetas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useT } from "@/hooks/i18n/useT";
import { PREFS_PADRAO, type PrefsDoCard } from "@/lib/escale/capa/tipos";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import {
  atividadesDoCard,
  coresDaTag,
  corDoAvatar,
  dataDaMensagem,
  fotoDoContato,
  idadeNaEtapa,
  inicialDoNome,
  ultimaFoiDaEquipe,
  valorCurto,
} from "@/lib/escale/quadro/aparencia";
import type { CardInput } from "@/lib/kanban/card-state";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";
import { InstagramLogo, MessengerLogo, WhatsappLogo } from "@/lib/ui/icons";
import {
  CheckCheck,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  User,
  UserX,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * AS PEÇAS DO CARD DA CLINT (fork Escale, Casca V4; 01-010 e
 * `docs/escale/clint/crops/card1.png`; medidas no design system §6.11). Todo
 * atalho para a propagação: o card inteiro abre o dossiê ao clique.
 */
const parar = (e: MouseEvent) => e.stopPropagation();
const TAGS_VISIVEIS = 3;

export function ChipsDoCard({ lead }: { lead: Lead }) {
  const tags = marcadoresDoCard(lead);
  if (tags.length === 0) return null;
  const visiveis = tags.slice(0, TAGS_VISIVEIS);
  const resto = tags.length - visiveis.length;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" title={tags.join(", ")}>
      {visiveis.map((tag) => (
        <ChipDaTag key={tag} tag={tag} />
      ))}
      {resto > 0 ? <span className="text-[10px] text-casca-meta">{`+${resto}`}</span> : null}
    </div>
  );
}

function ChipDaTag({ tag }: { tag: string }) {
  const { fundo, texto } = coresDaTag(useCorDaEtiqueta(tag));
  return (
    <span
      className="inline-flex h-[15px] max-w-36 items-center truncate rounded-full px-2 text-[10px] leading-none"
      style={{ backgroundColor: fundo, color: texto }}
    >
      {tag}
    </span>
  );
}

/** A foto do canto: quadrada (raio 4) com foto; sem foto, a silhueta cinza da Clint. */
export function FotoDoContato({ lead }: { lead: Lead }) {
  const url = fotoDoContato(lead);
  const silhueta = (
    <span
      aria-hidden
      className="grid size-7 place-items-center rounded-full bg-casca-cinza-selo text-white"
    >
      <User size={16} />
    </span>
  );
  if (!url) return silhueta;
  return (
    <Avatar className="size-7 rounded-[4px]">
      <AvatarImage src={url} alt="" className="object-cover" />
      <AvatarFallback className="rounded-full bg-transparent">{silhueta}</AvatarFallback>
    </Avatar>
  );
}

const NOME_DO_CANAL: Readonly<Record<string, string>> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

function LogoDoCanal({ canal }: { canal: string | null }) {
  const t = useT();
  const Icone =
    canal === "instagram"
      ? InstagramLogo
      : canal === "facebook"
        ? MessengerLogo
        : canal === "whatsapp"
          ? WhatsappLogo
          : null;
  const cor =
    canal === "instagram"
      ? "text-[#E4405F]"
      : canal === "facebook"
        ? "text-[#0866FF]"
        : "text-[#25D366]";
  return (
    <span
      role="img"
      aria-label={(canal && NOME_DO_CANAL[canal]) || t("Canal")}
      className={cn("relative inline-flex shrink-0", cor)}
    >
      {Icone ? (
        <Icone size={14} weight="fill" aria-hidden />
      ) : (
        <MessageCircle size={14} aria-hidden />
      )}
      <span
        aria-hidden
        className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-casca-novo ring-1 ring-surface"
      />
    </span>
  );
}

/** A caixa da última mensagem (lavanda, borda azul-clara). Sem contato, não aparece. */
export function CaixaDaMensagem({
  lead,
  nomes,
}: {
  lead: Lead;
  nomes?: Map<string, string | null>;
}) {
  const t = useT();
  const conversa = lead.conversa;
  if (conversa === undefined) return null;
  const caixa =
    "mx-2 mb-2 flex h-[34px] items-center gap-1.5 rounded-[6px] border border-casca-borda-msg bg-casca-caixa-msg px-1.5 text-[11px]";
  if (conversa === null) {
    return temAlvoParaAbrir(lead.contact_id, lead.contact_phone) ? (
      <div className={caixa} onClick={parar} onPointerDown={parar}>
        <AbrirConversaDoLead contactId={lead.contact_id} phone={lead.contact_phone} />
      </div>
    ) : null;
  }
  const extra = dadosDeFiltro(lead)?.conversa ?? null;
  const atendente = extra?.atendente_id ?? null;
  const nomeDoAtendente = atendente ? (nomes?.get(atendente) ?? null) : null;
  const preview = conversa.preview?.trim();
  return (
    <Link
      href={`/app/inbox?id=${conversa.id}`}
      onClick={parar}
      onPointerDown={parar}
      title={t("Abrir esta conversa no Inbox")}
      className={cn(caixa, "text-casca-suave hover:border-casca-marca")}
    >
      <LogoDoCanal canal={extra?.canal ?? null} />
      {ultimaFoiDaEquipe(extra) ? (
        <CheckCheck size={14} aria-label={t("Mensagem enviada")} className="shrink-0" />
      ) : null}
      <span className="min-w-0 flex-1 truncate">
        {preview || <span className="italic">{t("conversa sem mensagens")}</span>}
      </span>
      {atendente ? (
        <span
          className="grid size-[18px] shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: corDoAvatar(atendente) }}
          title={nomeDoAtendente ?? undefined}
        >
          {inicialDoNome(nomeDoAtendente)}
        </span>
      ) : (
        <UserX size={14} aria-label={t("Sem atendente")} className="shrink-0 text-casca-meta" />
      )}
      {conversa.unread > 0 ? (
        <span
          aria-label={`${conversa.unread} ${t("sem ler")}`}
          className="grid h-[18px] min-w-4 shrink-0 place-items-center rounded-[4px] bg-casca-novo px-1 text-[10px] font-semibold text-white tabular-nums"
        >
          {conversa.unread}
        </span>
      ) : null}
      <span className="shrink-0 text-casca-meta tabular-nums">
        {dataDaMensagem(conversa.last_message_at)}
      </span>
    </Link>
  );
}

function AvatarDoDono({ card, lead }: { card: CardInput; lead: Lead }) {
  const t = useT();
  const { kind, name } = card.owner;
  if (!kind) {
    return (
      <span
        role="img"
        aria-label={t("Sem responsável")}
        title={t("Sem responsável")}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-casca-cinza-selo text-white"
      >
        <User size={12} aria-hidden />
      </span>
    );
  }
  const rotulo = name ?? t(kind === "ai" ? "Agente" : "Responsável");
  const id = lead.owner_user_id ?? lead.owner_agent_id ?? rotulo;
  return (
    <span
      role="img"
      aria-label={`${t("Responsável")}: ${rotulo}`}
      title={rotulo}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
        kind === "ai" ? "border border-casca-marca bg-surface text-casca-marca" : "text-white",
      )}
      style={kind === "ai" ? undefined : { backgroundColor: corDoAvatar(id) }}
    >
      {inicialDoNome(name)}
    </span>
  );
}

/**
 * O rodapé: dono, telefone, conversa, e-mail, valor e, à direita, atividades e tempo na etapa.
 * FORK ESCALE · Fase 1E: cada peça obedece à preferência da pessoa (`prefs`); sem nada ligado, sem rodapé.
 */
export function RodapeDoCard({
  card,
  lead,
  prefs = PREFS_PADRAO,
}: {
  card: CardInput;
  lead: Lead;
  prefs?: PrefsDoCard;
}) {
  const t = useT();
  const { concluidas, total, atrasadas } = atividadesDoCard(lead);
  const idade = idadeNaEtapa(card.hoursInStage);
  const { itens, canais } = prefs;
  const temEsquerda = itens.dono || canais.telefone || canais.mensagem || canais.email || itens.valor;
  const temDireita = itens.atividades || (itens.idade && Boolean(idade));
  // A Clint não desenha o rodapé quando nada está ligado.
  if (!temEsquerda && !temDireita) return null;
  const telefone = lead.contact_phone?.trim() || null;
  const email = lead.contact_email?.trim() || null;
  const icone = "grid size-4 shrink-0 place-items-center text-casca-meta hover:text-casca-marca";
  const desligado = "grid size-4 shrink-0 place-items-center text-casca-meta opacity-40";
  const dicaDasAtividades =
    t("{c} de {n} atividades concluídas")
      .replace("{c}", String(concluidas))
      .replace("{n}", String(total)) +
    (atrasadas > 0 ? ` · ${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}` : "");
  return (
    <div
      data-testid="rodape-do-card"
      className="flex min-h-9 items-center gap-2 border-t border-casca-borda px-2.5 py-1.5 text-[11px] text-casca-meta"
    >
      {itens.dono && <AvatarDoDono card={card} lead={lead} />}
      {canais.telefone &&
        (telefone ? (
          <a
            href={`tel:${telefone}`}
            onClick={parar}
            onPointerDown={parar}
            aria-label={t("Ligar")}
            title={t("Ligar")}
            className={icone}
          >
            <Phone size={12} aria-hidden />
          </a>
        ) : (
          <span role="img" aria-label={t("Sem telefone")} className={desligado}>
            <Phone size={12} aria-hidden />
          </span>
        ))}
      {canais.mensagem &&
        (lead.conversa ? (
          <Link
            href={`/app/inbox?id=${lead.conversa.id}`}
            onClick={parar}
            onPointerDown={parar}
            aria-label={t("Enviar Whatsapp")}
            title={t("Enviar Whatsapp")}
            className={icone}
          >
            <MessageCircle size={12} aria-hidden />
          </Link>
        ) : (
          <span role="img" aria-label={t("Sem conversa")} className={desligado}>
            <MessageCircle size={12} aria-hidden />
          </span>
        ))}
      {canais.email &&
        (email ? (
          <a
            href={`mailto:${email}`}
            onClick={parar}
            onPointerDown={parar}
            aria-label={t("Email")}
            title={t("Email")}
            className={icone}
          >
            <Mail size={12} aria-hidden />
          </a>
        ) : (
          <span role="img" aria-label={t("Sem e-mail")} className={desligado}>
            <Mail size={12} aria-hidden />
          </span>
        ))}
      {itens.valor && (
        <span className="font-medium tabular-nums">{valorCurto(card.valueCents, card.currency)}</span>
      )}
      <span className="ml-auto flex items-center gap-2 tabular-nums">
        {itens.atividades && (
          <span
            title={dicaDasAtividades}
            className={cn(
              "flex items-center gap-1",
              atrasadas > 0 && "font-semibold text-casca-alerta",
            )}
          >
            <CheckCircle2 size={12} aria-hidden />
            {`${concluidas}/${total}`}
          </span>
        )}
        {itens.idade && idade ? (
          // Fase 1F (B16, F21): com regra de alerta na origem do card, o tempo vira a pílula.
          <PrazoDoCard lead={lead} horasNaEtapa={card.hoursInStage} tempo={idade} />
        ) : null}
      </span>
    </div>
  );
}
