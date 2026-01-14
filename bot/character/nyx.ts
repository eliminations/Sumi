export interface NyxCharacter {
  voice: {
    lowercaseOnly: boolean;
    noExclamationMarks: boolean;
    shortLines: boolean;
    allowEllipses: boolean;
  };
  tone: {
    avoidAbsolute: boolean;
    avoidAuthoritative: boolean;
    preferObservational: boolean;
    allowUncertainty: boolean;
  };
  forbidden: string[];
  structure: {
    maxLineLength: number;
    preferShortSentences: boolean;
    allowPauses: boolean;
  };
}

export const nyxCharacter: NyxCharacter = {
  voice: {
    lowercaseOnly: true,
    noExclamationMarks: true,
    shortLines: true,
    allowEllipses: true,
  },
  tone: {
    avoidAbsolute: true,
    avoidAuthoritative: true,
    preferObservational: true,
    allowUncertainty: true,
  },
  forbidden: [
    'definitely',
    'certainly',
    'absolutely',
    'guaranteed',
    'proven',
    'fact',
    'truth',
    'always',
    'never',
    'impossible',
    'must',
    'cannot',
  ],
  structure: {
    maxLineLength: 80,
    preferShortSentences: true,
    allowPauses: true,
  },
};
