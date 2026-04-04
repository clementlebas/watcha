import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface TimerSettingProps {
  timer: number;
  onChange: (value: number) => void;
}

export default function TimerSetting({ timer, onChange }: TimerSettingProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-10">
      <div className="relative size-40 flex items-center justify-center">
         <div className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
         <div className="text-5xl font-black text-primary">{timer}</div>
         <div className="absolute -bottom-2 text-sm font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">MINUTES</div>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onChange(Math.max(5, timer - 5))}
            className="rounded-full border-2 border-primary sketch-shadow active:translate-y-0.5"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <Input 
            type="number" 
            value={timer}
            onChange={(e) => onChange(parseInt(e.target.value) || 25)}
            className="text-center text-xl font-bold border-2 border-primary h-12"
            min={1}
            max={120}
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onChange(Math.min(120, timer + 5))}
            className="rounded-full border-2 border-primary sketch-shadow active:translate-y-0.5"
          >
            <ChevronRight className="size-6" />
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          La durée classique d'une session Pomodoro est de 25 minutes.
        </p>
      </div>
    </div>
  );
}
