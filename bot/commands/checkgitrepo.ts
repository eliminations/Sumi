import { Context } from 'telegraf';
import { GitHubScanner } from '../services/githubScanner';
import { SecurityAnalyzer, SecurityAnalysis } from '../services/securityAnalyzer';
import { getShortMascot } from '../utils/randomMascot';
import { getInvalidUrl, getMissingArgs, getError } from '../utils/variations';
import { formatResponse } from '../utils/formatter';

function getConfidenceMeter(confidenceScore: number, confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  const bars = Math.floor(confidenceScore / 10);
  const filledBars = '#'.repeat(bars);
  const emptyBars = '-'.repeat(10 - bars);
  return `Confidence: [${filledBars}${emptyBars}] ${confidenceScore}%  ${confidenceLevel}`;
}

function normalizeCommandText(text: string): string {
  return text.replace(/@\w+/g, '').trim();
}

export function createCheckGitRepoHandler(scanner: GitHubScanner, analyzer: SecurityAnalyzer) {
  return async (ctx: Context) => {
    const messageText = normalizeCommandText((ctx.message as any)?.text || '');
    const args = messageText.split(' ').slice(1).join(' ').trim();

    const replyOptions = {
      reply_to_message_id: ctx.message.message_id
    };

    if (!args) {
      const errorMsg = formatResponse(`${getMissingArgs()}\n\nexample: /scanrepo https://github.com/owner/repo`);
      await ctx.reply(errorMsg, replyOptions);
      return;
    }

    const thinkingVariants = [
      'tracing the surface...',
      'mapping what\'s visible...',
      'reading the structure...',
      'following patterns...',
      'observing...'
    ];
    const thinkingMsg = formatResponse(thinkingVariants[Math.floor(Math.random() * thinkingVariants.length)]);
    await ctx.reply(thinkingMsg, replyOptions);

    try {
      const parsed = await scanner.parseRepoUrl(args);
      if (!parsed) {
        const errorMsg = formatResponse(getInvalidUrl());
        await ctx.reply(errorMsg, replyOptions);
        return;
      }

      const analysis = await analyzer.analyzeRepo(parsed.owner, parsed.repo);

      const score = analysis.score ?? 50;
      const riskLevel = analysis.riskLevel ?? 'SUSPICIOUS';
      const confidenceLevel = analysis.confidenceLevel ?? 'LOW';
      const confidenceScore = analysis.confidenceScore ?? 30;

      const mascot = getShortMascot(Math.random() < 0.5 ? 'cat' : 'octopus');
      
      // opening: acknowledge action taken
      const openingVariants = [
        'i took a look.',
        'i spent some time with it.',
        'i went through what was visible.',
        'i looked where i could.',
        'i started tracing the surface.'
      ];
      
      let response = `${mascot}\n\n`;
      response += openingVariants[Math.floor(Math.random() * openingVariants.length)] + '\n\n';
      
      // middle: describe observations
      response += `Security Score: ${String(score).padStart(3)} / 100\n`;
      response += `Risk Level:     ${riskLevel}\n`;
      response += getConfidenceMeter(confidenceScore, confidenceLevel) + '\n';

      if (analysis.scoreRationale) {
        response += `\n${analysis.scoreRationale}\n`;
      }

      // surface uncertainty naturally
      if (confidenceLevel !== 'HIGH') {
        const uncertaintyNotes = [
          'there\'s still more i haven\'t seen.',
          'this only covers part of it.',
          'some depth remains unmeasured.',
          'the picture isn\'t complete.',
          'absence of evidence isn\'t clarity.'
        ];
        response += '\n' + uncertaintyNotes[Math.floor(Math.random() * uncertaintyNotes.length)] + '\n';
      } else {
        const highConfidenceNotes = [
          'visible structure seems consistent.',
          'what i could see suggests...',
          'patterns appear stable.',
          'surface looks coherent.'
        ];
        response += '\n' + highConfidenceNotes[Math.floor(Math.random() * highConfidenceNotes.length)] + '\n';
      }
      
      // closing: suggest continued attention or caution
      const closingVariants = [
        'worth keeping an eye on.',
        'i wouldn\'t stop watching it.',
        'attention over time would help.',
        'it\'s too early to relax.',
        'nothing here asks for trust yet.'
      ];
      response += '\n' + closingVariants[Math.floor(Math.random() * closingVariants.length)];

      const formattedResponse = formatResponse(response);
      await ctx.reply(`\`\`\`\n${formattedResponse}\n\`\`\``, { parse_mode: 'Markdown', ...replyOptions });
    } catch (error) {
      const mascot = getShortMascot(Math.random() < 0.5 ? 'cat' : 'octopus');
      let response = `${mascot}\n\n`;
      response += 'i couldn\'t complete that.\n';
      response += 'something interrupted the scan.\n\n';
      response += 'try again later.';
      const formattedResponse = formatResponse(response);
      await ctx.reply(formattedResponse, replyOptions);
    }
  };
}
