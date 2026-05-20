export function assignmentRewardCoins(assignment) {
  const fallback = assignment?.maxPoints ?? 100;
  return Math.max(0, Number(assignment?.rewardCoins ?? fallback) || 0);
}

export function awardedCoinsForGrade(points, assignment) {
  const maxPoints = Math.max(1, Number(assignment?.maxPoints ?? 100) || 100);
  const rewardCoins = assignmentRewardCoins(assignment);
  const ratio = Math.max(0, Math.min(1, Number(points) / maxPoints));
  return Math.round(rewardCoins * ratio);
}
