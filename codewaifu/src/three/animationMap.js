const MOOD_ANIMATION = {
  idle: "idle",
  victory: "standingClap",
  levelup: "joyfulJump",
  sad: "jumpingDown",
  working: "kneelingPointing",
  climbing: "climbing",
  jumpingDown: "jumpingDown",
  rumbaDancing: "rumbaDancing",
  sittingLaughing: "sittingLaughing",
};

export function moodToAnimation(mood) {
  return MOOD_ANIMATION[mood];
}
