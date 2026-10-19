"use client";

import { useState } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { type ObjetoDeCampo, camposPorGrupo } from "@/lib/escale/campos/regras";
import { EyeOff } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

/** Ordem das abas na Clint (HiddenFields `Zg`): Contato, Negócio, Empresa. */
const OBJETOS: ObjetoDeCampo[] = ["contato", "negocio", "empresa"];
const ROTULO: Record<ObjetoDeCampo, string> = { contato: "Contato", negocio: "Negócio", empresa: "Empresa" };

/** Subaba "Visualização de campos" (HiddenFields da Clint): um interruptor por campo; desligado = oculto na origem. */
export function SecaoCamposVisiveis({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const [objeto, setObjeto] = useState<ObjetoDeCampo>("contato");
  const { catalogo, carregando, erro } = useCatalogoDeCampos(objeto);
  const ocultos = rascunho.camposOcultos;
  const segueOGrupo = ocultos.usar_do_grupo;
  const doGrupo = config.ocultosDoGrupo;
  const listaAtiva = segueOGrupo && doGrupo ? doGrupo[objeto] : ocultos[objeto];
  const temGrupo = Boolean(config.pipeline.group_id);
  const pode = config.podeAdministrar;

  const alternar = (chave: string, visivel: boolean) => {
    const atual = new Set(ocultos[objeto]);
    if (visivel) atual.delete(chave);
    else atual.add(chave);
    mudar((r) => ({ ...r, camposOcultos: { ...r.camposOcultos, [objeto]: [...atual] } }));
  };

  return (
    <div className="flex flex-col gap-5">
      <CabecaDaSecao icone={EyeOff} titulo={t("Visualização de campos")} descricao={t("Configure aqui a sua visualização de campos.")} />
      <div className="flex items-center gap-2">
        <CaixaDaCasca
          marcada={segueOGrupo}
          desabilitada={!pode || !temGrupo || !doGrupo}
          aoMudar={(v) => mudar((r) => ({ ...r, camposOcultos: { ...r.camposOcultos, usar_do_grupo: v } }))}
          rotulo={t("Utilizar a mesma configuração do grupo")}
        />
        <AjudaDaCasca texto={t("Se marcada essa opção, a configuração no grupo desta origem será priorizada")} />
      </div>
      <AbasDaCasca abas={OBJETOS.map((o) => ({ valor: o, rotulo: t(ROTULO[o]) }))} valor={objeto} aoMudar={setObjeto} aria-label={t("Objeto")} />
      <p className="text-[12px] text-casca-suave">{t("Os campos desativados ficarão ocultos na origem.")}</p>
      {carregando && <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>}
      {erro && <p className="text-[13px] text-casca-suave">{t("Ocorreu um erro ao carregar os dados")}</p>}
      {!carregando && !erro && (
        <div className="flex flex-col gap-4">
          {camposPorGrupo(catalogo).map(({ grupo, campos }) => (
            <section key={grupo.id} aria-label={grupo.nome}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{grupo.nome}</p>
              <ul className="flex flex-col">
                {campos.map((c) => (
                  <li key={c.id} className="flex h-10 items-center justify-between border-b border-casca-borda">
                    <span className="text-[13px] text-casca-texto">{String(c.definicao.label)}</span>
                    <InterruptorDaCasca
                      ligado={!listaAtiva.includes(c.chave)}
                      desabilitado={segueOGrupo || !pode}
                      title={pode ? undefined : t("Só quem administra a conta gerencia os campos.")}
                      aoMudar={(v) => alternar(c.chave, v)}
                      aria-label={String(c.definicao.label)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[12px] text-casca-suave">{t("Campos preenchidos não serão ocultos.")}</p>
    </div>
  );
}
