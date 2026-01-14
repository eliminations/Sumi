export const ASCII_CATS = [
  ` /\\_/\\  
( o.o )  Meow... I smell code.
 > ^ <`,

  ` /\\_/\\  
( -.- )  Let's see how naughty this repo is.
 > ~ <`,

  ` /\\_/\\  
( ^.^ )  Time to dig into some secrets.
 > - <`,

  ` /\\_/\\  
( o.o )  I've got nine lives. This repo might not.
 > ^ <`
];

export function getRandomCat(): string {
  return ASCII_CATS[Math.floor(Math.random() * ASCII_CATS.length)];
}
