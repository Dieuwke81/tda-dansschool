
"use client";

import { type ReactNode } from "react";

type Rol = "eigenaar" | "docent" | "gast" | "lid";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles: Rol[];
  rol?: Rol;
};

export default function AuthGuard({ children, allowedRoles, rol }: AuthGuardProps) {
  if (!rol || !allowedRoles.includes(rol)) {
    return null;
  }

  return <>{children}</>;
}
