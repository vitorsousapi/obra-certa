import { ReactNode } from "react";
import { ColaboradorNav } from "./ColaboradorNav";

interface ColaboradorLayoutProps {
  children: ReactNode;
}

export function ColaboradorLayout({ children }: ColaboradorLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ColaboradorNav />
      <main className="container py-6">{children}</main>
    </div>
  );
}
