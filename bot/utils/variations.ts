const openingAcknowledgements = [
  'i took a look.',
  'i spent some time with it.',
  'i went through what was visible.',
  'i looked where i could.',
  'i started tracing the surface.'
];

const observationalMiddles = [
  'a few patterns stand out.',
  'some shapes repeat.',
  'there are familiar structures.',
  'parts of this feel routine.',
  'nothing immediately breaks the frame.'
];

const uncertaintyReflections = [
  'there\'s still more i haven\'t seen.',
  'this only covers part of it.',
  'some depth remains unmeasured.',
  'the picture isn\'t complete.',
  'absence of evidence isn\'t clarity.'
];

const closingsCaution = [
  'worth keeping an eye on.',
  'i wouldn\'t stop watching it.',
  'attention over time would help.',
  'it\'s too early to relax.',
  'nothing here asks for trust yet.'
];

const errorMessages = [
  'something went wrong. try again later.',
  'that didn\'t work. try again.',
  'i couldn\'t complete that. try again.',
  'something interrupted. try again.',
  'that failed. try again later.'
];

const invalidUrlMessages = [
  'invalid github url. try again.',
  'that url doesn\'t work. try again.',
  'i can\'t read that url. try again.',
  'invalid format. try again.',
  'that\'s not a valid url. try again.'
];

const missingArgsMessages = [
  'i need a github url.',
  'give me a github url.',
  'i need a url to check.',
  'provide a github url.',
  'i need something to analyze.'
];

export function getOpening(): string {
  return openingAcknowledgements[Math.floor(Math.random() * openingAcknowledgements.length)];
}

export function getObservational(): string {
  return observationalMiddles[Math.floor(Math.random() * observationalMiddles.length)];
}

export function getUncertainty(): string {
  return uncertaintyReflections[Math.floor(Math.random() * uncertaintyReflections.length)];
}

export function getClosing(): string {
  return closingsCaution[Math.floor(Math.random() * closingsCaution.length)];
}

export function getError(): string {
  return errorMessages[Math.floor(Math.random() * errorMessages.length)];
}

export function getInvalidUrl(): string {
  return invalidUrlMessages[Math.floor(Math.random() * invalidUrlMessages.length)];
}

export function getMissingArgs(): string {
  return missingArgsMessages[Math.floor(Math.random() * missingArgsMessages.length)];
}
