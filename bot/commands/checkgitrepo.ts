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

      // layer 0: surface reality
      if (analysis.surfaceReality) {
        response += 'what\'s here:\n';
        for (const observation of analysis.surfaceReality) {
          response += `  ${observation}\n`;
        }
        response += '\n';
      }

      // layer 1: structural coherence
      if (analysis.structuralObservations && analysis.structuralObservations.length > 0) {
        response += 'structure:\n';
        for (const observation of analysis.structuralObservations) {
          response += `  ${observation}\n`;
        }
        response += '\n';
      }

      // layer 2: dependency risk
      if (analysis.dependencyObservations && analysis.dependencyObservations.length > 0) {
        response += 'dependencies:\n';
        for (const observation of analysis.dependencyObservations) {
          response += `  ${observation}\n`;
        }
        response += '\n';
      }

      // specific findings if any
      if (analysis.findings && analysis.findings.length > 0) {
        response += 'what stands out:\n';
        const topFindings = analysis.findings.slice(0, 3);
        for (const finding of topFindings) {
          const location = finding.file ? ` (${finding.file})` : '';
          response += `  ${finding.description}${location}\n`;
        }
        if (analysis.findings.length > 3) {
          response += `  ...and ${analysis.findings.length - 3} more patterns\n`;
        }
        response += '\n';
      }

      // synthesis observations
      if (analysis.synthesisObservations && analysis.synthesisObservations.length > 0) {
        for (const observation of analysis.synthesisObservations) {
          response += `${observation}\n`;
        }
        response += '\n';
      }

      // uncertainty concentration
      if (analysis.uncertaintyAreas && analysis.uncertaintyAreas.length > 0) {
        response += 'where uncertainty concentrates:\n';
        for (const area of analysis.uncertaintyAreas) {
          response += `  ${area}\n`;
        }
        response += '\n';
      }

      // fallback rationale if new fields not present
      if (!analysis.surfaceReality && analysis.scoreRationale) {
        response += `${analysis.scoreRationale}\n\n`;
      }

      // wallet/intentional vulnerability notes
      if (analysis.walletNote) {
        response += `${analysis.walletNote}\n\n`;
      }
      if (analysis.intentionalVulnerabilityNote) {
        response += `${analysis.intentionalVulnerabilityNote}\n\n`;
      }

      // closing: suggest continued attention
      const closingVariants = [
        'worth keeping an eye on.',
        'i wouldn\'t stop watching it.',
        'attention over time would help.',
        'deserves human judgment.',
        'context matters here.'
      ];
      response += closingVariants[Math.floor(Math.random() * closingVariants.length)];

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
