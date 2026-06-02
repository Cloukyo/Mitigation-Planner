"use client";

import type { DamageProfileEvent } from "@/lib/fflogs/types";

export function FFLogsDamageProfilePreview({ damageProfile }: { damageProfile: DamageProfileEvent[] }) {
  if (!damageProfile.length) {
    return <p className="text-sm text-slate-500">No observed damage profile loaded.</p>;
  }

  return (
    <div className="max-h-48 overflow-auto rounded-md border border-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-950 text-slate-400">
          <tr>
            <th className="px-2 py-2">Time</th>
            <th className="px-2 py-2">Ability</th>
            <th className="px-2 py-2">Targets</th>
            <th className="px-2 py-2">Median</th>
            <th className="px-2 py-2">Average</th>
          </tr>
        </thead>
        <tbody>
          {damageProfile.slice(0, 40).map((profile) => (
            <tr key={profile.id} className="border-t border-slate-800">
              <td className="px-2 py-1 text-slate-400">{profile.displayTime}</td>
              <td className="px-2 py-1 text-slate-200">{profile.abilityName}</td>
              <td className="px-2 py-1">{profile.targetCount}</td>
              <td className="px-2 py-1">{profile.medianDamage.toLocaleString()}</td>
              <td className="px-2 py-1">{profile.averageDamage.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
