import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="LeadChasers accueil">
      <span className="brand-mark" aria-hidden="true">
        <Image
          src="/brand/leadchasers-logo-transparent.png"
          alt=""
          width={7039}
          height={6417}
          priority
        />
      </span>
      <span>Lead<span>Chasers</span><small>MEDIA COOP</small></span>
    </Link>
  );
}
