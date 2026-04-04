import React from 'react';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { Clock } from 'lucide-react';

export const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche"
];

interface RoutineEstablisherProps {
  routine: Record<string, string>;
  onToggleDay: (day: string) => void;
  onUpdateTime: (day: string, time: string) => void;
}

export default function RoutineEstablisher({ routine, onToggleDay, onUpdateTime }: RoutineEstablisherProps) {
  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
      {DAYS.map((day) => (
        <div 
          key={day}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
            routine[day] 
              ? "border-primary bg-primary/5 sketch-shadow" 
              : "border-muted opacity-60 hover:opacity-100"
          )}
        >
          <div className="flex items-center gap-3">
            <Checkbox 
              id={`routine-check-${day}`} 
              checked={!!routine[day]} 
              onCheckedChange={() => onToggleDay(day)}
              className="size-5 border-2"
            />
            <Label 
              htmlFor={`routine-check-${day}`}
              className="text-lg font-bold cursor-pointer"
            >
              {day}
            </Label>
          </div>
          
          {routine[day] && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <Clock className="size-4 text-muted-foreground" />
              <Input 
                type="time" 
                value={routine[day]}
                onChange={(e) => onUpdateTime(day, e.target.value)}
                className="w-32 border-2 border-primary/30 h-10 font-bold focus:border-primary"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
