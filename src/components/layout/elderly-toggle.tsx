"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";

export function ElderlyToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.classList.contains("elderly"));
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.classList.toggle("elderly", next);
    try {
      localStorage.setItem("elderly-mode", String(next));
    } catch {}
  }

  return (
    <Button
      variant={on ? "default" : "ghost"}
      size="icon-sm"
      onClick={toggle}
      title={on ? "关闭老年模式" : "老年模式"}
      aria-label={on ? "关闭老年模式" : "老年模式"}
    >
      <Monitor className="h-4 w-4" />
    </Button>
  );
}
