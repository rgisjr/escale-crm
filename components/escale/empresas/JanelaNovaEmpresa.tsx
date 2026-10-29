"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { telefoneE164 } from "@/lib/escale/contatos/regras";
import { lerCnpj, mascaraDeCnpj } from "@/lib/escale/empresas/regras";
import { ErroDeTempoEsgotado, fetchComTempoMaximo } from "@/lib/escale/fetch-com-tempo-maximo";
import { ArrowLeft, ChevronRight } from "@/lib/ui/icons-da-casca";

import { type EscolhaDoContato, PassoContatoDaEmpresa } from "./PassoContatoDaEmpresa";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Passos({ atual }: { atual: "empresa" | "contato" }) {
  const t = useT();
  const passos: Array<["empresa" | "contato", number, string]> = [["empresa", 1, t("Empresa")], ["contato", 2, t("Contato")]];
  return (
    <span className="flex items-center gap-2">
      {passos.map(([chave, n, rotulo], i) => (
        <span key={chave} className="flex items-center gap-2">
          {i > 0 && <span className="text-casca-meta">›</span>}
          <span className={`flex size-[18px] items-center justify-center rounded-full text-[10px] font-semibold ${atual === chave ? "bg-casca-marca text-white" : "bg-casca-raia text-casca-suave"}`}>{n}</span>
          <span className={`text-[12px] ${atual === chave ? "text-casca-texto" : "text-casca-suave"}`}>{rotulo}</span>
        </span>
      ))}
    </span>
  );
}

/** "Nova empresa" da Clint (OrganizationCreateWizard): Empresa → Contato. */
export function JanelaNovaEmpresa({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [passo, setPasso] = useState<"empresa" | "contato">("empresa");
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [site, setSite] = useState("");
  const [contato, setContato] = useState<EscolhaDoContato>({ modo: "existente", contato: null });
  const [criando, setCriando] = useState(false);
  // O contato novo já criado: se a empresa falha, "Criar" de novo reaproveita em vez de recriar.
  const contatoCriado = useRef<{ id: string; nome: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberta) return;
    setPasso("empresa"); setNome(""); setCnpj(""); setSite(""); setErro(null);
    setContato({ modo: "existente", contato: null });
    contatoCriado.current = null;
  }, [aberta]);

  const cnpjLido = lerCnpj(cnpj);
  const podeContinuar = nome.trim().length > 0 && cnpjLido.ok;
  const contatoPronto =
    contato.modo === "existente"
      ? Boolean(contato.contato)
      : contato.nome.trim().length > 0 && (!contato.email.trim() || EMAIL.test(contato.email.trim())) && (!contato.telefone.trim() || Boolean(telefoneE164(contato.ddi, contato.telefone)));

  const resolverContato = async (): Promise<{ id: string; nome: string } | null> => {
    if (contato.modo === "existente") return contato.contato;
    if (contatoCriado.current) return contatoCriado.current;
    const telefone = contato.telefone.trim() ? telefoneE164(contato.ddi, contato.telefone) : null;
    const r = await fetchComTempoMaximo("/api/v1/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "manual", name: contato.nome.trim(), ...(telefone ? { phone_number: telefone } : {}), ...(contato.email.trim() ? { email: contato.email.trim() } : {}) }),
    });
    const corpo = await r.json().catch(() => null);
    if (!r.ok) {
      setErro(corpo?.error?.code === "contact_exists" ? t("Telefone já cadastrado.") : t("Falha ao criar o contato."));
      return null;
    }
    contatoCriado.current = { id: String(corpo.data.contact.id), nome: String(corpo.data.contact.name ?? contato.nome.trim()) };
    return contatoCriado.current;
  };

  const criar = async () => {
    if (criando || !contatoPronto) return;
    setCriando(true);
    setErro(null);
    try {
      const escolhido = await resolverContato();
      if (!escolhido) return;
      const r = await fetchComTempoMaximo("/api/v1/empresas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), cnpj: cnpj.trim(), site: site.trim(), contato_id: escolhido.id }),
      });
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(corpo?.error?.message ?? t("Não foi possível criar a empresa. Tente novamente."));
        return;
      }
      toast.success(t('Empresa "{name}" criada e vinculada a {contact}.').replace("{name}", nome.trim()).replace("{contact}", escolhido.nome || t("o contato")));
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      aoFechar();
      router.push(`/app/companies/${corpo.data.id}`);
    } catch (e) {
      // Estourou o tempo: o servidor pode ter criado a empresa depois do corte.
      // A janela fica aberta e a mensagem manda conferir a lista (Frente F).
      setErro(e instanceof ErroDeTempoEsgotado ? t(e.message) : t("Não foi possível criar a empresa. Tente novamente."));
    } finally {
      setCriando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} ocupado={criando} className="w-[min(640px,100%)]">
      <div className="flex items-center gap-3 pr-6">
        {passo === "contato" && (
          <button type="button" aria-label={t("Voltar")} onClick={() => setPasso("empresa")} disabled={criando} className="ml-6 rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"><ArrowLeft size={16} /></button>
        )}
        <CabecaDaJanela
          titulo={passo === "empresa" ? t("Nova empresa") : t("Contato da empresa")}
          descricao={passo === "empresa" ? t("Dados da empresa — no próximo passo você vincula um contato.") : undefined}
        />
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        {passo === "empresa" ? (
          <>
            <Campo rotulo={t("Nome da empresa")} obrigatorio>
              <CampoDeTexto autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("Ex.: Atlas Distribuidora")} />
            </Campo>
            <Campo rotulo={t("CNPJ")}>
              <CampoDeTexto inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(mascaraDeCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
              {cnpjLido.ok ? (
                <p className="mt-1 text-[11px] text-casca-meta">{t("Opcional. Ajuda a identificar duplicidades automaticamente.")}</p>
              ) : (
                <p className="mt-1 text-[11px] text-casca-alerta">{t("CNPJ inválido.")}</p>
              )}
            </Campo>
            <Campo rotulo={t("Site")}>
              <CampoDeTexto value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://…" />
            </Campo>
          </>
        ) : (
          <PassoContatoDaEmpresa valor={contato} aoMudar={(v) => { contatoCriado.current = null; setContato(v); }} />
        )}
        {erro && <p className="text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        {passo === "empresa" ? (
          <div className="flex w-full items-center justify-between gap-3">
            <Passos atual="empresa" />
            <span className="flex gap-2.5">
              <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
              <BotaoDaJanela variante="salvar" disabled={!podeContinuar} title={!podeContinuar ? t("Informe o nome da empresa.") : undefined} onClick={() => setPasso("contato")}>
                {t("Continuar")} <ChevronRight size={14} />
              </BotaoDaJanela>
            </span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <BotaoDaJanela variante="cancelar" onClick={() => setPasso("empresa")} disabled={criando}>
              <ArrowLeft size={14} /> {t("Voltar")}
            </BotaoDaJanela>
            <BotaoDaJanela variante="salvar" onClick={criar} disabled={!contatoPronto || criando} title={!contatoPronto ? t("Escolha ou crie o contato.") : undefined}>
              {criando ? t("Criando…") : t("Criar empresa")}
            </BotaoDaJanela>
          </div>
        )}
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
