"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/logout";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
    >
      {pending ? "Logging out…" : "Logout"}
    </Button>
  );
}
