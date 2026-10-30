import type { ReactNode } from "react";

/**
 * OS ÍCONES DO AVISO DA CLINT (fork Escale). Desenhos copiados do código dela
 * (`CheckCircleCustom`, `XCircleCustom`, `InfoCircleCustom`, `WarningCustom`).
 * O aviso comum (o "snack" da Clint, que é o padrão) não tem ícone: o sonner já
 * não põe ícone em `toast()` sem tipo. O "Fechar" entra no lugar do X.
 */
function Sucesso() {
  return (
    <svg data-aviso-icone="sucesso" aria-hidden width={20} height={20} viewBox="0 0 16 16" fill="green">
      <circle cx="8" cy="8" r="7.5" fill="#fff" />
      <path d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-3.97-3.03a.75.75 0 00-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 00-1.06 1.06L6.97 11.03a.75.75 0 001.079-.02l3.992-4.99a.75.75 0 00-.01-1.05z" />
    </svg>
  );
}

function Erro() {
  return (
    <svg data-aviso-icone="erro" aria-hidden width={20} height={20} viewBox="0 0 512 512" fill="red">
      <circle cx="256" cy="256" r="240" fill="#fff" />
      <path d="M256 512a256 256 0 100-512 256 256 0 100 512zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" />
    </svg>
  );
}

function Info() {
  return (
    <svg data-aviso-icone="info" aria-hidden width={20} height={20} viewBox="0 0 16 16" fill="#2196F3">
      <circle cx="8" cy="8" r="7.5" fill="#fff" />
      <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

function Alerta() {
  return (
    <svg
      data-aviso-icone="alerta"
      aria-hidden
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="#FFC107"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#fff" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fff" />
    </svg>
  );
}

function Carregando() {
  return (
    <span
      data-aviso-icone="carregando"
      aria-hidden
      className="block size-4 animate-spin rounded-full border-2 border-[var(--escale-aviso-carregando)] border-t-transparent"
    />
  );
}

export function iconesDoAviso(fechar: string): {
  success: ReactNode;
  error: ReactNode;
  info: ReactNode;
  warning: ReactNode;
  loading: ReactNode;
  close: ReactNode;
} {
  return {
    success: <Sucesso />,
    error: <Erro />,
    info: <Info />,
    warning: <Alerta />,
    loading: <Carregando />,
    close: <span>{fechar}</span>,
  };
}
