import { nyxCharacter } from '../character/nyx';

function toLowercase(text: string): string {
  return text.toLowerCase();
}

function removeExclamationMarks(text: string): string {
  return text.replace(/!/g, '');
}

function softenAbsolutes(text: string): string {
  const absolutes = nyxCharacter.forbidden;
  let result = text;
  
  for (const word of absolutes) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      if (word === 'must') return 'should';
      if (word === 'cannot') return 'may not';
      if (word === 'always') return 'often';
      if (word === 'never') return 'rarely';
      if (word === 'impossible') return 'unlikely';
      if (word === 'darling') return '';
      if (word === 'perfect') return 'adequate';
      if (word === 'complete') return 'partial';
      if (word === 'finished') return 'ongoing';
      if (word === 'done') return 'in progress';
      if (word === 'final') return 'current';
      if (word === 'ultimate') return '';
      if (word === 'best') return 'reasonable';
      if (word === 'worst') return 'concerning';
      if (word === 'amazing') return 'notable';
      if (word === 'incredible') return 'unusual';
      if (word === 'fantastic') return 'adequate';
      if (word === 'awesome') return 'adequate';
      return match.toLowerCase();
    });
  }
  
  return result;
}

function removeMarketingLanguage(text: string): string {
  const marketingPatterns = [
    /\b(discover|unlock|transform|revolutionize|breakthrough|game.?changer)\b/gi,
    /\b(guaranteed|proven|tested|trusted|reliable|secure)\b/gi,
    /\b(amazing|incredible|fantastic|awesome|perfect|ultimate)\b/gi,
  ];
  
  let result = text;
  for (const pattern of marketingPatterns) {
    result = result.replace(pattern, '');
  }
  
  return result.replace(/\s+/g, ' ').trim();
}

function removePerformativeConfidence(text: string): string {
  const performativePatterns = [
    /\bi (know|guarantee|promise|assure|confirm|verify)\b/gi,
    /\b(trust me|believe me|i'm certain|i'm sure)\b/gi,
    /\b(without a doubt|no question|absolutely|definitely)\b/gi,
  ];
  
  let result = text;
  for (const pattern of performativePatterns) {
    result = result.replace(pattern, '');
  }
  
  return result.replace(/\s+/g, ' ').trim();
}

function limitEllipses(text: string): string {
  const ellipsisPattern = /\.{3,}/g;
  const matches = text.match(ellipsisPattern);
  
  if (matches && matches.length > 2) {
    let count = 0;
    return text.replace(ellipsisPattern, () => {
      count++;
      if (count <= 2) {
        return '...';
      }
      return '.';
    });
  }
  
  return text.replace(/\.{4,}/g, '...');
}

function formatLines(text: string): string {
  const maxLength = nyxCharacter.structure.maxLineLength;
  const lines = text.split('\n');
  const formatted: string[] = [];
  
  for (const line of lines) {
    if (line.length <= maxLength) {
      formatted.push(line);
      continue;
    }
    
    const words = line.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          formatted.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      formatted.push(currentLine);
    }
  }
  
  return formatted.join('\n');
}

function preserveCodeBlocks(text: string): { text: string; blocks: string[] } {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const blocks: string[] = [];
  let blockIndex = 0;
  
  const textWithPlaceholders = text.replace(codeBlockRegex, (match) => {
    blocks.push(match);
    return `__CODE_BLOCK_${blockIndex++}__`;
  });
  
  return { text: textWithPlaceholders, blocks };
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
  let result = text;
  for (let i = 0; i < blocks.length; i++) {
    result = result.replace(`__CODE_BLOCK_${i}__`, blocks[i]);
  }
  return result;
}

function preserveStructuredLabels(text: string): { text: string; labels: Map<string, string> } {
  // Patterns to preserve structured data labels and their values
  const labelPatterns = [
    /(Security Score:\s*\d+\s*\/\s*\d+)/g,
    /(Risk Level:\s*[A-Z_]+)/g,
    /(Reuse Score:\s*\d+%)/g,
    /(Verdict:\s*[A-Z_\s]+)/g,
    /(Confidence:\s*\[[#-]+\]\s*\d+%\s*[A-Z]+)/g,
  ];
  
  const labels = new Map<string, string>();
  let labelIndex = 0;
  let result = text;
  
  for (const pattern of labelPatterns) {
    result = result.replace(pattern, (match) => {
      const placeholder = `__label_${labelIndex}__`;
      labels.set(placeholder, match);
      labelIndex++;
      return placeholder;
    });
  }
  
  return { text: result, labels };
}

function restoreStructuredLabels(text: string, labels: Map<string, string>): string {
  let result = text;
  labels.forEach((original, placeholder) => {
    result = result.replace(placeholder, original);
  });
  return result;
}

export function formatResponse(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }
  
  const { text: textWithoutBlocks, blocks } = preserveCodeBlocks(text);
  const { text: textWithoutLabels, labels } = preserveStructuredLabels(textWithoutBlocks);
  
  let formatted = textWithoutLabels;
  
  formatted = toLowercase(formatted);
  formatted = removeExclamationMarks(formatted);
  formatted = softenAbsolutes(formatted);
  formatted = removeMarketingLanguage(formatted);
  formatted = removePerformativeConfidence(formatted);
  formatted = limitEllipses(formatted);
  formatted = formatLines(formatted);
  
  formatted = restoreStructuredLabels(formatted, labels);
  formatted = restoreCodeBlocks(formatted, blocks);
  
  return formatted.trim();
}
