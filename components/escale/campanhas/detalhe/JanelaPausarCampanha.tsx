"use client";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";

const BLOCOS = [
  {
    titulo: "Contatos já alcançados",
    texto: "Quem já recebeu a mensagem continua com ela normalmente, nada é desfeito.",
  },
  {
    titulo: "Contatos ainda não alcançados",
    texto: "Nenhum contato novo recebe mensagem enquanto a campanha estiver pausada.",
  },
  {
    titulo: "Mensagens em trânsito",
    texto: "Uma mensagem já entregue à Meta no momento da pausa ainda é concluída normalmente.",
  },
] as const;

/** "PAUSAR CAMPANHA" (material 2.2 e 3; C14; sem print, provisório): os três blocos e a nota da Clint. */
export function JanelaPausarCampanha({
  aberta,
  ocupado,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  ocupado: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  return (
    <JanelaDeConfirmacao
      aberta={aberta}
      aoFechar={aoFechar}
      titulo={t("Pausar campanha")}
      rotuloDoConfirmar={t("Pausar campanha")}
      ocupado={ocupado}
      aoConfirmar={aoConfirmar}
    >
      <div className="space-y-3 text-[13px]">
        <p className="text-casca-suave">
          {t("O envio desta campanha é interrompido até você retomar.")}
        </p>
        {BLOCOS.map((b) => (
          <div key={b.titulo} className="rounded-[8px] border border-casca-borda p-3">
            <p className="font-medium text-casca-texto">{t(b.titulo)}</p>
            <p className="mt-0.5 text-casca-suave">{t(b.texto)}</p>
          </div>
        ))}
        <p className="text-[12px] text-casca-suave">
          {t(
            "Você pode retomar ou cancelar esta campanha quando quiser. Ao retomar, o envio continua apenas para quem ainda não foi alcançado.",
          )}
        </p>
      </div>
    </JanelaDeConfirmacao>
  );
}
