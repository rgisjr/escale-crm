"use client";

import { useRouter } from "next/navigation";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { useT } from "@/hooks/i18n/useT";
import type { CampoDeColuna } from "@/lib/escale/contatos/regras";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { valorParaLeitura } from "@/lib/escale/negocio/campos";
import { MessageCircle, Phone, Star } from "@/lib/ui/icons-da-casca";

const formatoDaMoeda = (moeda: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda });

export function CelulaPrincipal({ linha }: { linha: LinhaDeEmpresa }) {
  const t = useT();
  const p = linha.principal;
  if (!p) return <span className="text-[12px] text-casca-meta">—</span>;
  return (
    <div className="flex items-center gap-2">
      <FotoDaLinha id={p.id} nome={p.nome} temFoto={p.tem_foto} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[14px] font-medium text-casca-texto">
          <Star size={11} className="fill-current text-casca-marca" aria-label={t("Contato principal")} />
          <span className="truncate">{p.nome}</span>
        </p>
        {p.telefone && (
          <p className="flex items-center gap-1 text-[13px] text-casca-suave">
            <Phone size={11} />
            {formatarTelefone(p.telefone)}
            <span className="ml-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <a href={`tel:${p.telefone}`} onClick={(e) => e.stopPropagation()} title={t("Chamar")} className="text-casca-marca"><Phone size={14} /></a>
              {p.conversa_id && (
                <a href={`/app/inbox?id=${p.conversa_id}`} onClick={(e) => e.stopPropagation()} title={t("Abrir em Conversas")} className="text-casca-marca"><MessageCircle size={14} /></a>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function BotaoVer({ rotulo, href }: { rotulo: string; href: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); router.push(href); }}
      className="h-6 rounded-[6px] border border-casca-borda px-2.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
    >
      {rotulo}
    </button>
  );
}

export function CelulaValor({ valor, moeda }: { valor: number; moeda: string }) {
  return <span className="text-[14px] font-semibold text-casca-texto">{formatoDaMoeda(moeda).format(valor)}</span>;
}

export function CelulaCampoDaEmpresa({ campo, linha }: { campo: CampoDeColuna | undefined; linha: LinhaDeEmpresa }) {
  const t = useT();
  const bruto = campo ? linha.campos[campo.chave] : undefined;
  const texto = campo ? valorParaLeitura(campo.tipo, campo.opcoes, bruto, t) : "";
  return texto ? <span className="truncate text-[14px] text-casca-suave">{texto}</span> : <span className="text-[12px] text-casca-meta">—</span>;
}
