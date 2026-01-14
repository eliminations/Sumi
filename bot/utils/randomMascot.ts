import { getRandomCat } from '../mascots/cats';
import { getRandomOctopus } from '../mascots/octopus';

export type MascotType = 'cat' | 'octopus';

export interface Mascot {
  type: MascotType;
  art: string;
}

export function randomMascot(): Mascot {
  const isCat = Math.random() < 0.5;
  
  if (isCat) {
    return {
      type: 'cat',
      art: getRandomCat()
    };
  } else {
    return {
      type: 'octopus',
      art: getRandomOctopus()
    };
  }
}

export function getShortMascot(type: MascotType): string {
  if (type === 'cat') {
    return ` /\\_/\\  
( o.o )
 > ^ <`;
  } else {
    return `   .---.
  ( o o )
   \\___/`;
  }
}
