export const ASCII_OCTOPUSES = [
  `   .---.
  ( o o )  Eight arms. Zero mercy.
   \\___/
  /| | |\\`,

  `   (o_o)
  /|     |\\   Scanning deeply...
 / | | | | \\`,

  `   .---.
  ( - - )  I see everything.
   \\___/
  /| | |\\`,

  `   (o_o)
  /|     |\\   No code escapes me.
 / | | | | \\`
];

export function getRandomOctopus(): string {
  return ASCII_OCTOPUSES[Math.floor(Math.random() * ASCII_OCTOPUSES.length)];
}
