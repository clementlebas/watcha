import React from 'react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export const TOPICS = [
  "Blockchain",
  "Web",
  "Start up",
  "AI",
  "Cloud",
  "Data",
  "Mobile",
  "DevOps",
  "Science"
];

interface TopicSelectorProps {
  selectedTopics: string[];
  onToggle: (topic: string) => void;
}

export default function TopicSelector({ selectedTopics, onToggle }: TopicSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {TOPICS.map((topic) => (
        <button
          key={topic}
          onClick={() => onToggle(topic)}
          className={cn(
            "flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 active:scale-95",
            selectedTopics.includes(topic)
              ? "border-primary bg-primary text-primary-foreground sketch-shadow"
              : "border-muted bg-transparent hover:border-primary/50 text-muted-foreground"
          )}
        >
          <span className="font-semibold">{topic}</span>
          {selectedTopics.includes(topic) && <Check className="ml-2 size-4" />}
        </button>
      ))}
    </div>
  );
}
