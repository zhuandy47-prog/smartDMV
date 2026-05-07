import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell" style={{ position: "relative" }}>
      <Link href="/" className="auth-back">
        <ArrowLeft size={14} /> Go back
      </Link>
      {children}
    </div>
  );
}
