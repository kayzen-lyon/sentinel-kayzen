import Link from "next/link";
import { WITHDRAW_LABEL } from "@/lib/withdrawal";

/**
 * Pied de page minimal (pages sans le Footer complet : connexion, console) portant
 * le point d'entrée de la rétractation, qui doit être présent sur chaque page.
 */
export default function WithdrawalLink() {
  return (
    <footer className="no-print border-t border-border py-4">
      <p className="container-x flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <Link href="/mentions-legales" className="hover:text-fg">Mentions légales</Link>
        <Link href="/cgv" className="hover:text-fg">CGV</Link>
        <Link href="/retractation" className="hover:text-fg">{WITHDRAW_LABEL}</Link>
      </p>
    </footer>
  );
}
