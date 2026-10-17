"use client";
import Link from "next/link";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { type ItemDeColuna, ROTULO_DA_COLUNA, chaveDoItem } from "@/lib/escale/contatos/regras";
import { ChevronDown } from "@/lib/ui/icons-da-casca";

import {
  CelulaContato,
  CelulaExtra,
  CelulaNegocios,
  CelulaTags,
  rotuloDoItem,
} from "./CelulasDoContato";
import { FotoDaLinha } from "./FotoDaLinha";
import { MenuDaLinha } from "./MenuDaLinha";

const TH =
  "h-[52px] px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto";
const TD = "px-3 align-middle";

/**
 * A TABELA DE CONTATOS (Clint `ContactsTableV2`, captura 03-001). "Nome" é
 * fixa; as outras seguem as colunas da pessoa. A caixinha aparece desligada
 * (a seleção é da 2B), como a Clint mostra a quem não tem `CONTACT_BULK_ACTIONS`.
 */
export function TabelaDeContatos({
  linhas,
  colunas,
  carregando,
  erro,
  aoTentarDeNovo,
  podeVerNegocios,
  podeExcluir,
  aoAdicionarNegocio,
}: {
  linhas: LinhaDeContato[];
  colunas: ItemDeColuna[];
  carregando: boolean;
  erro: boolean;
  aoTentarDeNovo: () => void;
  podeVerNegocios: boolean;
  podeExcluir: boolean;
  aoAdicionarNegocio: (linha: LinhaDeContato) => void;
}) {
  const t = useT();
  const visiveis = colunas.filter(
    (c) => !(c.tipo === "nativa" && c.chave === "negocios" && !podeVerNegocios),
  );
  const largura = visiveis.length + 3;

  const corpo = () => {
    if (carregando && linhas.length === 0) {
      return Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className="h-16 border-b border-casca-borda">
          <td colSpan={largura} className="px-3">
            <div className="h-4 w-1/3 animate-pulse rounded-casca-gatilho bg-casca-raia" />
          </td>
        </tr>
      ));
    }
    if (erro) {
      return (
        <tr>
          <td colSpan={largura} className="py-16 text-center">
            <p className="text-[14px] font-medium text-casca-texto">
              {t("Não foi possível carregar os contatos.")}
            </p>
            <p className="mt-1 text-[13px] text-casca-suave">
              {t("Tente novamente em instantes.")}
            </p>
            <button
              type="button"
              onClick={aoTentarDeNovo}
              className="mt-4 h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              {t("Tentar novamente")}
            </button>
          </td>
        </tr>
      );
    }
    if (linhas.length === 0) {
      return (
        <tr>
          <td colSpan={largura} className="py-16 text-center">
            <p className="text-[14px] font-medium text-casca-texto">
              {t("Não foram encontrados contatos.")}
            </p>
            <p className="mt-1 text-[13px] text-casca-suave">
              {t("Tente ajustar a busca ou os filtros.")}
            </p>
          </td>
        </tr>
      );
    }
    return linhas.map((linha) => {
      const nome =
        nomeDoContato({
          name: linha.nome,
          display_name: linha.display_name,
          phone_number: linha.telefone,
        }) ?? t("Sem nome");
      return (
        <tr
          key={linha.id}
          aria-label={nome}
          className="group h-16 border-b border-casca-borda hover:bg-casca-raia"
        >
          <td className={`${TD} w-10`} title={t("Em breve")}>
            <CaixaDaCasca
              marcada={false}
              aoMudar={() => {}}
              aria-label={t("Selecionar contato")}
              desabilitada
            />
          </td>
          <td className={`${TD} min-w-[240px]`}>
            <div className="flex items-center gap-3">
              <FotoDaLinha id={linha.id} nome={nome} temFoto={linha.tem_foto} />
              <Link
                href={`/app/contacts/${linha.id}`}
                className="truncate text-[14px] font-medium text-casca-texto hover:underline"
              >
                {nome}
              </Link>
            </div>
          </td>
          {visiveis.map((item) => (
            <td
              key={chaveDoItem(item)}
              className={`${TD} ${item.tipo === "nativa" && item.chave === "negocios" ? "w-40" : "min-w-[200px]"}`}
            >
              {item.tipo === "nativa" && item.chave === "contato" ? (
                <CelulaContato linha={linha} />
              ) : item.tipo === "nativa" && item.chave === "tags" ? (
                <CelulaTags tags={linha.tags} />
              ) : item.tipo === "nativa" && item.chave === "negocios" ? (
                <CelulaNegocios linha={linha} aoAdicionar={aoAdicionarNegocio} />
              ) : (
                <CelulaExtra item={item} linha={linha} />
              )}
            </td>
          ))}
          <td className={`${TD} w-10 text-right`}>
            <MenuDaLinha linha={linha} podeExcluir={podeExcluir} />
          </td>
        </tr>
      );
    });
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-casca-borda">
          <th className={`${TH} w-10`} title={t("Em breve")}>
            <span className="flex items-center gap-1">
              <CaixaDaCasca
                marcada={false}
                aoMudar={() => {}}
                aria-label={t("Selecionar todos")}
                desabilitada
              />
              <ChevronDown size={12} aria-hidden className="text-casca-meta" />
            </span>
          </th>
          <th className={TH}>{t("Nome")}</th>
          {visiveis.map((item) => (
            <th key={chaveDoItem(item)} className={TH}>
              {rotuloDoItem(item, t, ROTULO_DA_COLUNA)}
            </th>
          ))}
          <th className={`${TH} w-10`}>
            <span className="sr-only">{t("Ações")}</span>
          </th>
        </tr>
      </thead>
      <tbody>{corpo()}</tbody>
    </table>
  );
}
