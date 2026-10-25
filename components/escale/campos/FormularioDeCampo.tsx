"use client";

import { useEffect, useMemo, useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { NovoCampo } from "@/lib/escale/campos/banco";
import {
  type CampoDoCatalogo,
  type Catalogo,
  type GrupoDeCampos,
  OBJETOS_DE_CAMPO,
  type ObjetoDeCampo,
  ROTULO_DO_OBJETO,
  TIPOS_DA_CLINT,
  type TipoDaClint,
  tipoDoMotor,
} from "@/lib/escale/campos/regras";
import { Briefcase, Building2, Plus, User } from "@/lib/ui/icons-da-casca";

import { IconeDoTipo } from "./IconeDoTipo";
import { OpcoesDeSelecao } from "./OpcoesDeSelecao";

const EXEMPLO: Record<ObjetoDeCampo, string> = { contato: "Ex: Linkedin", empresa: "Ex: Número de funcionários", negocio: "Ex: Projeto interessado" };
const ICONE_DO_OBJETO: Record<ObjetoDeCampo, typeof User> = { contato: User, empresa: Building2, negocio: Briefcase };

export interface FormularioDeCampoProps {
  objeto: ObjetoDeCampo;
  catalogo: Catalogo;
  grupoSugerido: GrupoDeCampos | null;
  /** Editando: o nome, o grupo e as opções mudam; o objeto e o tipo não. */
  campo?: CampoDoCatalogo;
  aoFechar: () => void;
  aoSalvar: (entrada: NovoCampo) => Promise<unknown>;
  /** O grupo novo nasce no objeto escolhido no formulário. */
  aoCriarGrupo: (nome: string, objeto: ObjetoDeCampo) => Promise<GrupoDeCampos>;
  /** Avisa a janela do objeto escolhido nas pílulas, para ela passar o catálogo dele em `catalogo`. */
  aoMudarObjeto?: (objeto: ObjetoDeCampo) => void;
}

/** "Adicionar campo" da Clint (AddFieldForm), por cima da janela de gerenciamento. */
export function FormularioDeCampo(p: FormularioDeCampoProps) {
  const t = useT();
  const editando = Boolean(p.campo);
  const [objeto, setObjeto] = useState<ObjetoDeCampo>(p.objeto);
  const [nome, setNome] = useState(p.campo ? String(p.campo.definicao.label) : "");
  const [grupoId, setGrupoId] = useState<string | null>(p.campo?.grupo_id ?? p.grupoSugerido?.id ?? null);
  const [grupos, setGrupos] = useState<GrupoDeCampos[]>(p.catalogo.grupos);
  const [tipo, setTipo] = useState<TipoDaClint | null>(p.campo ? (TIPOS_DA_CLINT.find((x) => x.motor === p.campo!.definicao.type)?.chave ?? null) : null);
  const [opcoes, setOpcoes] = useState<string[]>(p.campo?.definicao.options?.map((o) => o.label) ?? [""]);
  const [novoGrupo, setNovoGrupo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // O catálogo da prop é o do objeto escolhido: ao trocar o objeto, os grupos são os dele e o grupo
  // escolhido (de outro objeto) sai, senão o POST levaria um `grupo_id` que não existe no destino.
  useEffect(() => {
    if (editando) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- acompanha o catálogo do objeto escolhido
    setGrupos(p.catalogo.grupos);
    setGrupoId((atual) => {
      if (atual && p.catalogo.grupos.some((g) => g.id === atual)) return atual;
      const sugerido = p.grupoSugerido && p.catalogo.grupos.some((g) => g.id === p.grupoSugerido!.id) ? p.grupoSugerido.id : null;
      return sugerido ?? p.catalogo.grupos[0]?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao catálogo recebido
  }, [p.catalogo.grupos]);

  const nomeRepetido = useMemo(() => {
    const n = nome.trim().toLowerCase();
    return Boolean(n) && p.catalogo.campos.some((c) => c.id !== p.campo?.id && String(c.definicao.label).trim().toLowerCase() === n);
  }, [nome, p.catalogo.campos, p.campo]);

  const precisaDeOpcoes = tipo === "SELECT" || tipo === "MULTIPLE_SELECT";
  const opcoesValidas = opcoes.map((o) => o.trim()).filter(Boolean);
  const podeSalvar = nome.trim().length > 0 && !nomeRepetido && Boolean(grupoId) && Boolean(tipo) && (!precisaDeOpcoes || opcoesValidas.length > 0) && !salvando;

  const salvar = async () => {
    if (!podeSalvar || !tipo || !grupoId) return;
    setSalvando(true);
    setErro(null);
    try {
      await p.aoSalvar({ objeto, nome: nome.trim(), grupo_id: grupoId, tipo, opcoes: precisaDeOpcoes ? opcoesValidas : undefined });
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };

  const criarGrupo = async () => {
    if (!novoGrupo?.trim()) return setErro(t("O nome do grupo é obrigatório!"));
    try {
      const g = await p.aoCriarGrupo(novoGrupo.trim(), objeto);
      setGrupos((atuais) => [...atuais, g]);
      setGrupoId(g.id);
      setNovoGrupo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    }
  };

  return (
    <JanelaDaCasca aberta onFechar={p.aoFechar} className="w-[min(640px,100%)]">
      <CabecaDaJanela titulo={editando ? t("Editar nome do campo") : t("Adicionar campo")} />
      <div className="flex flex-col gap-5 px-6 py-4">
        {!editando && (
          <div>
            <p className="mb-3 text-[13px] font-medium text-casca-texto">{t("Estou criando um campo para:")}</p>
            <div role="radiogroup" aria-label={t("Objeto")} className="flex gap-2">
              {OBJETOS_DE_CAMPO.map((o) => {
                const Icone = ICONE_DO_OBJETO[o];
                const ativo = objeto === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => { setObjeto(o); p.aoMudarObjeto?.(o); }}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-[8px] border px-2 py-3 text-[12px] font-medium ${ativo ? "border-casca-marca text-casca-marca" : "border-casca-borda text-casca-texto"} bg-casca-raia`}
                  >
                    <Icone size={22} />
                    {t(ROTULO_DO_OBJETO[o])}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Campo rotulo={t("Nome do campo")} obrigatorio>
          <CampoDeTexto id="nome-do-campo" aria-label={t("Nome do campo")} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={EXEMPLO[objeto]} />
          {nomeRepetido && <p className="mt-1.5 text-[11px] text-casca-alerta">{t("Já existe um outro campo com o nome informado, o campo deve ser único.")}</p>}
        </Campo>

        {nome.trim() && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-casca-texto">{t("Grupo")}</p>
            {novoGrupo === null ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SeletorDaCasca
                    aparencia="janela"
                    valor={grupoId ?? ""}
                    opcoes={grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))}
                    aoMudar={(v) => setGrupoId(v)}
                    aria-label={t("Grupo")}
                    vazio={t("Selecione um grupo")}
                  />
                </div>
                <button type="button" aria-label={t("Adicionar um grupo")} title={t("Adicionar um grupo")} onClick={() => setNovoGrupo("")} className="rounded-full border border-casca-borda p-1 text-casca-marca">
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="mb-1 text-[12px] text-casca-suave">{t("Nome do Grupo")}</p>
                  <CampoDeTexto autoFocus value={novoGrupo} onChange={(e) => setNovoGrupo(e.target.value)} placeholder={t("Digite para criar um novo grupo")} />
                </div>
                <BotaoDaJanela variante="salvar" onClick={criarGrupo}>{t("Criar grupo")}</BotaoDaJanela>
              </div>
            )}
          </div>
        )}

        {grupoId && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-casca-texto">{t("Tipo do campo")}</p>
            <div role="radiogroup" aria-label={t("Tipo do campo")} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIPOS_DA_CLINT.map((x) => {
                const ativo = tipo === x.chave;
                return (
                  <button
                    key={x.chave}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    disabled={editando}
                    title={editando ? t("O tipo não muda depois de criado.") : undefined}
                    onClick={() => { setTipo(x.chave); if ((x.chave === "SELECT" || x.chave === "MULTIPLE_SELECT") && opcoes.length === 0) setOpcoes([""]); }}
                    className={`flex h-16 flex-col items-center justify-center gap-1 rounded-[8px] border text-[11px] font-medium disabled:opacity-60 ${ativo ? "border-casca-marca text-casca-marca" : "border-casca-borda text-casca-texto"} bg-casca-raia`}
                  >
                    <IconeDoTipo tipo={tipoDoMotor(x.chave)} tamanho={18} />
                    {t(x.rotulo)}
                  </button>
                );
              })}
            </div>
            {precisaDeOpcoes && <div className="mt-5"><OpcoesDeSelecao opcoes={opcoes} aoMudar={setOpcoes} /></div>}
          </div>
        )}
        {erro && <p className="text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={p.aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={!podeSalvar} title={!podeSalvar ? t("Preencha nome, grupo e tipo.") : undefined}>{t("Salvar")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
