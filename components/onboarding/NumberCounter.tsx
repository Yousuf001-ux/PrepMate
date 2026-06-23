"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NumberCounterProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function NumberCounter({ value, min = 1, max = 100, onChange }: NumberCounterProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center gap-4">
      <Button 
        variant="outline" 
        size="icon" 
        className="h-10 w-10 rounded-full border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <span className="text-title-large font-medium text-center tabular-nums">
        {value}
      </span>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="h-10 w-10 rounded-full border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50"
        onClick={handleIncrement}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
