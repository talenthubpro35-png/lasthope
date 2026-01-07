import { StatCard } from "../StatCard";
import { Briefcase } from "lucide-react";

export default function StatCardExample() {
  return (
    <StatCard
      title="Total Applications"
      value={128}
      icon={Briefcase}
      trend={{ value: 12, isPositive: true }}
    />
  );
}
