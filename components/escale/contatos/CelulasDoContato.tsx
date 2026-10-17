"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useConversaNovaComEscolhaDeCanal } from "@/components/channels/SeletorDeCanalParaConversa";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import {
  CAMPOS_DO_CONTATO_2A,
  type ItemDeColuna,
  formatarTelefone,
} from "@/lib/escale/contatos/regras";
import { AtSign, Mail, MessageCircle, Phone } from "@/lib/ui/icons-da-casca";

const MAXIMO_DE_TAGS = 6;
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

/** Telefone com ligar e WhatsApp no hover da linha, e-mail e Instagram embaixo (Clint `n:contact`). */
export function CelulaContato({ linha }: { linha: LinhaDeContato }) {
  const t = useT();
  const router = useRouter();
  const { iniciarConversa, seletor } = useConversaNovaComEscolhaDeCanal({
    aoAbrir: (id) => router.push(`/app/inbox?id=${id}`),
  });
  const acao =
    "grid size-5 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-marca-suave";
  return (
    <div className="grid gap-1">
      {linha.telefone && (
        <div className="flex items-center gap-2">
          <Phone size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="text-[12px] font-medium text-casca-texto">
            {formatarTelefone(linha.telefone)}
          </span>
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <a
              href={`tel:${linha.telefone}`}
              aria-label={t("Chamar")}
              title={t("Chamar")}
              className={acao}
            >
              <Phone size={14} aria-hidden />
            </a>
            {linha.conversa_id ? (
              <Link
                href={`/app/inbox?id=${linha.conversa_id}`}
                aria-label={t("Abrir em Conversas")}
                title={t("Abrir em Conversas")}
                className={acao}
              >
                <MessageCircle size={14} aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                aria-label={t("Abrir WhatsApp")}
                title={t("Abrir WhatsApp")}
                className={acao}
                onClick={() =>
                  iniciarConversa({
                    contact_id: linha.id,
                    phone_number: linha.telefone ?? undefined,
                  })
                }
              >
                <MessageCircle size={14} aria-hidden />
              </button>
            )}
          </span>
          {seletor}
        </div>
      )}
      {linha.email && (
        <div className="flex items-center gap-2">
          <Mail size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="truncate text-[12px] text-casca-texto">{linha.email}</span>
        </div>
      )}
      {linha.instagram && (
        <div className="flex items-center gap-2">
          <AtSign size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="text-[12px] text-casca-texto">{linha.instagram}</span>
        </div>
      )}
    </div>
  );
}

export function CelulaTags({ tags }: { tags: string[] }) {
  const resto = tags.length - MAXIMO_DE_TAGS;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, MAXIMO_DE_TAGS).map((tag) => (
        <ChipDaTag key={tag} tag={tag} />
      ))}
      {resto > 0 && (
        <span
          title={tags.slice(MAXIMO_DE_TAGS).join(", ")}
          className="text-[11px] font-medium text-casca-suave"
        >
          +{resto}
        </span>
      )}
    </div>
  );
}

/** "Ver N negócio(s)" (contorno na cor da marca) ou "Adicionar negócio" (contorno cinza). */
export function CelulaNegocios({
  linha,
  aoAdicionar,
}: {
  linha: LinhaDeContato;
  aoAdicionar: (linha: LinhaDeContato) => void;
}) {
  const t = useT();
  const botao =
    "inline-flex h-6 items-center rounded-casca-gatilho border px-2.5 text-[12px] font-medium transition-colors";
  if (linha.negocios > 0) {
    const rotulo = `${t("Ver")} ${linha.negocios} ${linha.negocios === 1 ? t("negócio") : t("negócios")}`;
    const href =
      linha.negocios === 1 && linha.negocio_unico
        ? `/app/leads/${linha.negocio_unico}`
        : `/app/contacts/${linha.id}`;
    return (
      <Link
        href={href}
        className={`${botao} border-casca-marca text-casca-marca hover:bg-casca-marca-suave`}
      >
        {rotulo}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => aoAdicionar(linha)}
      className={`${botao} border-casca-borda text-casca-texto hover:bg-casca-raia`}
    >
      {t("Adicionar negócio")}
    </button>
  );
}

const ROTULO_DO_STATUS = {
  anonimizado: "Anonimizado",
  bloqueado: "Bloqueado",
  pessoal: "Pessoal",
  ativo: "Ativo",
} as const;

/** As colunas extras ("Colunas" e "Campos do contato" do 03-002). */
export function CelulaExtra({ item, linha }: { item: ItemDeColuna; linha: LinhaDeContato }) {
  const t = useT();
  const texto = (v: string) => <span className="text-[12px] text-casca-texto">{v}</span>;
  if (item.tipo === "nativa") {
    if (item.chave === "status") return texto(t(ROTULO_DO_STATUS[linha.status]));
    if (item.chave === "ultima_atividade") return texto(dataBr(linha.ultima_atividade));
    if (item.chave === "criado_em") return texto(dataBr(linha.criado_em));
    if (item.chave === "origem") return texto(linha.origem);
    return null;
  }
  if (item.chave === "nascimento")
    return texto(linha.nascimento ? dataBr(`${linha.nascimento}T12:00:00`) : "—");
  const tipo = item.chave.replace(/^link_/, "");
  const href = linha.links[tipo];
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate text-[12px] text-casca-marca hover:underline"
    >
      {href}
    </a>
  ) : (
    texto("—")
  );
}

export function rotuloDoItem(
  item: ItemDeColuna,
  t: (s: string) => string,
  rotulos: Record<string, string>,
): string {
  if (item.tipo === "nativa") return t(rotulos[item.chave] ?? item.chave);
  const campo = CAMPOS_DO_CONTATO_2A.find((c) => c.chave === item.chave);
  return campo ? t(campo.rotulo) : item.chave;
}
