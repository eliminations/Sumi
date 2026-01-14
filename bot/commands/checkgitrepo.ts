import { Context } from 'telegraf';
import { GitHubScanner } from '../services/githubScanner';
import { SecurityAnalyzer, SecurityAnalysis } from '../services/securityAnalyzer';
import { getShortMascot } from '../utils/randomMascot';
import { getInvalidUrl, getMissingArgs, getError } from '../utils/variations';

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
      await ctx.reply(`${getMissingArgs()}\n\nexample: /checkgitrepo https://github.com/owner/repo`, replyOptions);
      return;
    }

    const thinkingVariants = [
      'thinking... sharp claws, deeper cuts.',
      'thinking... tracing the threads.',
      'thinking... following the patterns.',
      'thinking... reading between lines.',
      'thinking... mapping the structure.'
    ];
    await ctx.reply(thinkingVariants[Math.floor(Math.random() * thinkingVariants.length)], replyOptions);

    try {
      const parsed = await scanner.parseRepoUrl(args);
      if (!parsed) {
        await ctx.reply(getInvalidUrl(), replyOptions);
        return;
      }

      const analysis = await analyzer.analyzeRepo(parsed.owner, parsed.repo);

      const score = analysis.score ?? 50;
      const riskLevel = analysis.riskLevel ?? 'SUSPICIOUS';
      const confidenceLevel = analysis.confidenceLevel ?? 'LOW';
      const confidenceScore = analysis.confidenceScore ?? 30;

      const mascot = getShortMascot(Math.random() < 0.5 ? 'cat' : 'octopus');
      
      let response = `${mascot}\n\n`;
      response += `Security Score: ${String(score).padStart(3)} / 100\n`;
      response += `Risk Level:     ${riskLevel}\n`;

      response += getConfidenceMeter(confidenceScore, confidenceLevel) + '\n';

      if (analysis.scoreRationale) {
        response += `\n${analysis.scoreRationale}\n`;
      }

      if (confidenceLevel !== 'HIGH') {
        const lowConfidenceNotes = [
          'some parts were harder to reach.',
          'results reflect what was visible.',
          'partial visibility.',
          'limited access to content.',
          'some depth remains unmeasured.'
        ];
        response += '\n' + lowConfidenceNotes[Math.floor(Math.random() * lowConfidenceNotes.length)] + '\n';
      }

      await ctx.reply(`\`\`\`\n${response}\n\`\`\``, { parse_mode: 'Markdown', ...replyOptions });
    } catch (error) {
      const mascot = getShortMascot(Math.random() < 0.5 ? 'cat' : 'octopus');
      let response = `${mascot}\n\n`;
      response += `Security Score: ${String(50).padStart(3)} / 100\n`;
      response += `Risk Level:     SUSPICIOUS\n`;
      response += getConfidenceMeter(30, 'LOW') + '\n';
      response += '\nno meaningful risk signals detected.\n';
      await ctx.reply(`\`\`\`\n${response}\n\`\`\``, { parse_mode: 'Markdown', ...replyOptions });
    }
  };
}
