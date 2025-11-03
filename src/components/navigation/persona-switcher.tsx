"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const PERSONAS = [
  { value: "pm", label: "Escritório de Projetos" },
  { value: "bu", label: "Gestor BU" },
  { value: "client", label: "Coordenação Cliente" },
  { value: "supplier", label: "Gestor Fornecedor" }
];

export function PersonaSwitcher() {
  const [persona, setPersona] = useState(PERSONAS[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <span className="flex items-center gap-2">
            {persona.label}
            <ChevronDown size={16} />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50 min-w-[260px] rounded-lg border border-neutral-100 bg-white p-2 shadow-card">
        <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wide text-neutral-400">
          Personas
        </DropdownMenuLabel>
        {PERSONAS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="cursor-pointer rounded-md px-2 py-2 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100"
            onSelect={() => setPersona(option)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
