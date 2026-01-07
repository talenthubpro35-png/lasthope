import { SkillBadge } from "../SkillBadge";

export default function SkillBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <SkillBadge skill="React" />
      <SkillBadge skill="TypeScript" variant="outline" />
      <SkillBadge skill="Node.js" removable onRemove={() => console.log("Removed Node.js")} />
    </div>
  );
}
