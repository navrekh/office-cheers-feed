import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BUZZWORDS: { phrase: string; translation: string }[] = [
  {
    phrase: "Let's take this offline",
    translation:
      "If I have to look at your shared screen for another 30 seconds I am opening a beer.",
  },
  {
    phrase: "Circle back next week",
    translation:
      "I am actively hungover and will not process this spreadsheet today.",
  },
  {
    phrase: "High-priority deliverable",
    translation:
      "The VP promised something to a client while drinking at an airport bar.",
  },
  {
    phrase: "Synergistic alignment",
    translation:
      "We are drinking together at 5:00 PM to forget this project structure.",
  },
];

export function BuzzwordDecrypter() {
  const [phrase, setPhrase] = useState<string>(BUZZWORDS[0].phrase);
  const translation = BUZZWORDS.find((b) => b.phrase === phrase)?.translation ?? "";

  return (
    <Card className="p-4 border-border">
      <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
        <Sparkles className="size-4 text-primary" /> Corporate Buzzword Decrypter
      </h4>
      <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
        Pick a phrase. We'll tell you what it actually meant.
      </p>
      <Select value={phrase} onValueChange={setPhrase}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select a corporate phrase" />
        </SelectTrigger>
        <SelectContent>
          {BUZZWORDS.map((b) => (
            <SelectItem key={b.phrase} value={b.phrase} className="text-xs">
              {b.phrase}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <blockquote
        key={phrase}
        className="mt-3 relative rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-xs italic leading-relaxed text-foreground/90 animate-in fade-in duration-300"
      >
        <span className="absolute -top-2 left-2 text-2xl leading-none text-primary/60 select-none">
          "
        </span>
        {translation}
      </blockquote>
    </Card>
  );
}

export default BuzzwordDecrypter;
