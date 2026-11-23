import { loadAnimation } from "#engine/animation";

export const fuelCanister = await loadAnimation(import("#/sprites/interactables/fuel-canister.webp"), {
  sprite: { removeBackground: true, tolerance: 30 },
  animation: import("#/sprites/interactables/fuel-canister.animation.json")
});
