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
      return match.toLowerCase();
    });
  }
  
  return result;
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

export function formatResponse(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }
  
  const { text: textWithoutBlocks, blocks } = preserveCodeBlocks(text);
  
  let formatted = textWithoutBlocks;
  
  formatted = toLowercase(formatted);
  formatted = removeExclamationMarks(formatted);
  formatted = softenAbsolutes(formatted);
  formatted = limitEllipses(formatted);
  formatted = formatLines(formatted);
  
  formatted = restoreCodeBlocks(formatted, blocks);
  
  return formatted.trim();
}
