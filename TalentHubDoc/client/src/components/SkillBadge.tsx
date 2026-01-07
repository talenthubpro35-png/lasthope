import { Badge } from "@/components/ui/badge";

interface SkillBadgeProps {
  skill: string;
  variant?: "default" | "secondary" | "outline";
  removable?: boolean;
  onRemove?: () => void;
}

export function SkillBadge({ skill, variant = "secondary", removable, onRemove }: SkillBadgeProps) {
  return (
    <Badge variant={variant} className="gap-1" data-testid={`badge-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}>
      {skill}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-destructive"
          data-testid={`button-remove-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
        >
          ×
        </button>
      )}
    </Badge>
  );
}
