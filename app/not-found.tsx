import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <Image
          src="/logo-mark.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto h-18 w-auto opacity-60"
        />
        <p className="mt-6 font-heading text-6xl font-bold text-fg">404</p>
        <h1 className="mt-2 font-heading text-xl font-semibold text-fg">
          Page introuvable
        </h1>
        <p className="mt-2 text-muted">
          Cette page a été déplacée ou n'existe pas.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
