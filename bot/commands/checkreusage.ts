import { Context } from 'telegraf';
import { GitHubScanner } from '../services/githubScanner';
import { ReuseDetector } from '../services/reuseDetector';
import { getShortMascot } from '../utils/randomMascot';
import { getInvalidUrl, getMissingArgs, getError, getOpening, getObservational, getUncertainty, getClosing } from '../utils/variations';
import { formatResponse } from '../utils/formatter';

function normalizeCommandText(text: string): string {
  return text.replace(/@\w+/g, '').trim();
}

export function createCheckReusageHandler(scanner: GitHubScanner, detector: ReuseDetector) {
  return async (ctx: Context) => {
    const messageText = normalizeCommandText((ctx.message as any)?.text || '');
    const args = messageText.split(' ').slice(1).join(' ').trim();

    const replyOptions = {
      reply_to_message_id: ctx.message.message_id
    };

    if (!args) {
      const errorMsg = formatResponse(`${getMissingArgs()}\n\nexample: /checkreusage https://github.com/owner/repo`);
      await ctx.reply(errorMsg, replyOptions);
      return;
    }

    const thinkingVariants = [
      'tracing patterns...',
      'comparing structures...',
      'looking for similarities...',
      'mapping reuse...',
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

      const analysis = await detector.detectReuse(parsed.owner, parsed.repo);

      const mascot = getShortMascot(Math.random() < 0.5 ? 'cat' : 'octopus');
      
      // opening: acknowledge action taken
      const openingVariants = [
        'i compared patterns.',
        'i looked for similarities.',
        'i traced reuse signals.',
        'i mapped structural patterns.',
        'i observed the codebase.'
      ];
      
      let response = `${mascot}\n\n`;
      response += openingVariants[Math.floor(Math.random() * openingVariants.length)] + '\n\n';
      
      // middle: describe observations
      response += `Reuse Score: ${String(analysis.reuseScore).padStart(3)}%\n`;
      response += `Verdict:     ${analysis.verdict.replace(/_/g, ' ')}\n\n`;

      if (analysis.verdict === 'ORIGINAL') {
        const originalVariants = [
          'structure looks distinct.',
          'patterns seem original.',
          'no obvious reuse visible.',
          'structure appears unique.',
          'patterns don\'t match known templates.'
        ];
        response += originalVariants[Math.floor(Math.random() * originalVariants.length)] + '\n';
        response += 'absence of reuse signals observed.\n';
      } else if (analysis.verdict === 'FORKED') {
        const forkVariants = [
          'marked as a fork.',
          'this is a fork.',
          'forked repository.',
          'derived from another project.'
        ];
        response += forkVariants[Math.floor(Math.random() * forkVariants.length)] + '\n';
        response += 'that\'s visible in the history.\n';
      } else if (analysis.verdict === 'HEAVILY_REUSED') {
        const reusedVariants = [
          'familiar patterns throughout.',
          'structure matches known templates.',
          'patterns suggest reuse.',
          'structure appears reused.',
          'familiar layout observed.'
        ];
        response += reusedVariants[Math.floor(Math.random() * reusedVariants.length)] + '\n';
        response += 'similarity to other projects is notable.\n';
      } else {
        const copiedVariants = [
          'familiar patterns observed.',
          'structure matches known code.',
          'patterns suggest copying.',
          'structure appears copied.',
          'familiar layout detected.'
        ];
        response += copiedVariants[Math.floor(Math.random() * copiedVariants.length)] + '\n';
        response += 'similarity to other projects is significant.\n';
      }
      
      // surface uncertainty naturally
      const uncertaintyNotes = [
        'there may be more i haven\'t seen.',
        'this reflects what was visible.',
        'partial visibility applies here too.',
        'some patterns may remain unobserved.'
      ];
      response += '\n' + uncertaintyNotes[Math.floor(Math.random() * uncertaintyNotes.length)] + '\n';
      
      // closing: suggest continued attention
      const closingVariants = [
        'worth noting.',
        'something to keep in mind.',
        'worth attention.',
        'notable pattern.'
      ];
      response += '\n' + closingVariants[Math.floor(Math.random() * closingVariants.length)];

      const formattedResponse = formatResponse(response);
      await ctx.reply(`\`\`\`\n${formattedResponse}\n\`\`\``, { parse_mode: 'Markdown', ...replyOptions });
    } catch (error) {
      const errorMsg = formatResponse('i couldn\'t complete that.\nsomething interrupted the analysis.\n\ntry again later.');
      await ctx.reply(errorMsg, replyOptions);
    }
  };
}
