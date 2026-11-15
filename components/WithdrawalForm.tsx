"use client";

import { useRef, useState } from "react";
import {
  CONFIRM_LABEL,
  STATEMENT_TEXT,
  WITHDRAW_LABEL,
  formatReceivedAt,
  type WithdrawalStatement,
} from "@/lib/withdrawal";

/**
 * Fonction de rétractation en ligne — portage React du composant de référence
 * eu-web-compliance (templates/consumer/withdrawal-function.*).
 * Point d'entrée « Renoncer au contrat ici » → déclaration (nom, contrat, e-mail)
 * → bouton « Confirmer la rétractation » → accusé à l'écran (focus déplacé).
 * L'accusé n'est affiché qu'après enregistrement par le serveur.
 */

type Field = keyof WithdrawalStatement;
type Ack = { receivedAt: string; reference: string; ackSent: boolean; statement: WithdrawalStatement };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERRORS: Record<Field, string> = {
  name: "Votre nom : saisissez votre nom, par exemple Alex Martin",
  contractId:
    "Contrat concerné : saisissez le numéro de devis ou de facture, ou l'adresse e-mail de votre compte Sentinel",
  email: "Adresse électronique : saisissez une adresse au format nom@exemple.fr",
};
const IDS: Record<Field, string> = { name: "wd-name", contractId: "wd-contract", email: "wd-email" };

export default function WithdrawalForm({ prefill }: { prefill: Partial<WithdrawalStatement> }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<WithdrawalStatement>({
    name: prefill.name ?? "",
    contractId: prefill.contractId ?? "",
    email: prefill.email ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [ack, setAck] = useState<Ack | null>(null);
  const [status, setStatus] = useState("");

  const statementTitle = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const ackTitle = useRef<HTMLHeadingElement>(null);

  function openStatement() {
    setOpen(true);
    requestAnimationFrame(() => statementTitle.current?.focus());
  }

  function validate(v: WithdrawalStatement) {
    const e: Partial<Record<Field, string>> = {};
    if (!v.name.trim()) e.name = ERRORS.name;
    if (!v.contractId.trim()) e.contractId = ERRORS.contractId;
    if (!EMAIL.test(v.email.trim())) e.email = ERRORS.email;
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (sending) return;
    const e = validate(values);
    setErrors(e);
    setSendError(false);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setSending(true);
    setStatus("Envoi de votre déclaration de rétractation.");
    try {
      const r = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.receivedAt) throw new Error("not recorded");
      setAck({ receivedAt: data.receivedAt, reference: data.reference, ackSent: Boolean(data.ackSent), statement: values });
      setStatus("Rétractation envoyée.");
      requestAnimationFrame(() => ackTitle.current?.focus());
    } catch {
      setSendError(true);
      setStatus("");
    } finally {
      setSending(false);
    }
  }

  const errorList = (Object.keys(errors) as Field[]).filter((k) => errors[k]);

  if (ack)
    return (
      <div className="card p-6" role="region" aria-labelledby="wd-ack-title">
        <h2 id="wd-ack-title" ref={ackTitle} tabIndex={-1} className="!mt-0">
          Votre rétractation a été envoyée
        </h2>
        <p>
          Nous l&apos;avons reçue le{" "}
          <time dateTime={ack.receivedAt}>{formatReceivedAt(ack.receivedAt)}</time>.
        </p>
        <p>Référence : {ack.reference}</p>
        <h3>Contenu de votre déclaration</h3>
        <dl className="space-y-1.5">
          <div><dt className="inline font-semibold">Déclaration : </dt><dd className="inline">{STATEMENT_TEXT}</dd></div>
          <div><dt className="inline font-semibold">Nom : </dt><dd className="inline">{ack.statement.name}</dd></div>
          <div><dt className="inline font-semibold">Contrat concerné : </dt><dd className="inline">{ack.statement.contractId}</dd></div>
          <div><dt className="inline font-semibold">Adresse pour la confirmation : </dt><dd className="inline">{ack.statement.email}</dd></div>
        </dl>
        {ack.ackSent ? (
          <p>
            Un accusé de réception reprenant ce contenu, cette date et cette heure est envoyé à{" "}
            {ack.statement.email}. Conservez-le.
          </p>
        ) : (
          <p>
            Votre rétractation est bien enregistrée, mais l&apos;accusé de réception n&apos;a pas pu
            être envoyé automatiquement. Nous vous l&apos;adressons à {ack.statement.email} ; sans
            nouvelles de notre part, écrivez à{" "}
            <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a> en citant la référence{" "}
            {ack.reference}.
          </p>
        )}
        <p className="sr-only" role="status">{status}</p>
      </div>
    );

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        aria-expanded={open}
        aria-controls="wd-statement"
        onClick={openStatement}
      >
        {WITHDRAW_LABEL}
      </button>

      <div id="wd-statement" hidden={!open} className="card mt-6 p-6">
        <h2 id="wd-statement-title" ref={statementTitle} tabIndex={-1} className="!mt-0">
          Votre déclaration de rétractation
        </h2>
        <p id="wd-statement-intro">
          Remplissez ou vérifiez les trois champs ci-dessous, puis choisissez «&nbsp;{CONFIRM_LABEL}&nbsp;».
          Vous n&apos;avez pas à donner de motif. Tous les champs sont obligatoires.
        </p>

        {errorList.length > 0 && (
          <div
            ref={summary}
            tabIndex={-1}
            role="group"
            aria-labelledby="wd-errors-title"
            className="mt-4 rounded-lg border border-risk/50 bg-risk/5 p-4"
          >
            <h3 id="wd-errors-title" className="!mt-0 text-base">
              {errorList.length === 1
                ? "La déclaration contient 1 erreur"
                : `La déclaration contient ${errorList.length} erreurs`}
            </h3>
            <ul>
              {errorList.map((k) => (
                <li key={k}>
                  <a href={`#${IDS[k]}`}>{errors[k]}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          noValidate
          onSubmit={submit}
          aria-labelledby="wd-statement-title"
          aria-describedby="wd-statement-intro"
          className="mt-6 space-y-5"
        >
          <FieldRow
            id={IDS.name}
            label="Votre nom"
            autoComplete="name"
            value={values.name}
            error={errors.name}
            onChange={(v) => setValues({ ...values, name: v })}
          />
          <FieldRow
            id={IDS.contractId}
            label="Contrat concerné"
            hint="Numéro de devis ou de facture, ou adresse e-mail de votre compte Sentinel."
            value={values.contractId}
            error={errors.contractId}
            onChange={(v) => setValues({ ...values, contractId: v })}
          />
          <FieldRow
            id={IDS.email}
            label="Adresse électronique pour la confirmation"
            hint="Nous envoyons l'accusé de réception de votre rétractation à cette adresse."
            type="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={(v) => setValues({ ...values, email: v })}
          />

          {sendError && (
            <p role="alert" className="text-risk">
              Votre déclaration de rétractation n&apos;a pas pu être envoyée. Rien n&apos;est perdu :
              vérifiez votre connexion et choisissez de nouveau «&nbsp;{CONFIRM_LABEL}&nbsp;», ou
              écrivez-nous à <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>.
            </p>
          )}

          {/* Libellé fixé par l'art. D. 221-5 du Code de la consommation : rien d'autre sur ce bouton. */}
          <button type="submit" className="btn btn-primary" aria-busy={sending}>
            {CONFIRM_LABEL}
          </button>
        </form>
      </div>
      <p className="sr-only" role="status">{status}</p>
    </div>
  );
}

function FieldRow({
  id,
  label,
  hint,
  type = "text",
  autoComplete,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="!mt-0 mb-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full"
      />
      {error && (
        <p id={`${id}-error`} className="!mt-1.5 text-sm text-risk">
          {error}
        </p>
      )}
    </div>
  );
}
