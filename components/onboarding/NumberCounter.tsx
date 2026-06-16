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
    <div className="flex items-center gap-6">
      <Button 
        variant="outline" 
        size="icon" 
        className="h-14 w-14 rounded-full border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50"
        onClick={handleDecrement}
        disabled={value <= min}
      >
        <Minus className="h-6 w-6" />
      </Button>
      
      <span className="text-display-medium font-medium min-w-[80px] text-center">
        {value}
      </span>
      
      <Button 
        variant="outline" 
        size="icon" 
        className="h-14 w-14 rounded-full border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50"
        onClick={handleIncrement}
        disabled={value >= max}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
