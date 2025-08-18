"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type Props = {
  label?: string;
  /** Fallback when history stack is empty or you prefer a fixed target */
  hrefFallback?: string;
};

export function BackButton({
  label = "Back",
  hrefFallback = "/dashboard",
}: Props) {
  const router = useRouter();

  const onClick = () => {
    // try history.back(); if nothing to go back to, push fallback
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(hrefFallback);
    }
  };

  return (
    <Button variant="outline" onClick={onClick}>
      <ChevronLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
