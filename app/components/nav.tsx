import { Link } from "~/components/ui/link";
import { Logo } from "~/components/logo";

export function Navbar() {
  return (
    <>
      <nav className="h-navbar z-navbar relative hidden items-center justify-between gap-6 px-6 py-3 md:flex">
        <div className="flex items-center gap-1">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </nav>
    </>
  );
}
