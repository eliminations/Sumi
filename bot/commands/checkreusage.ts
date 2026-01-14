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
      'thinking...',
      'thinking... tracing the threads.',
      'thinking... following the patterns.',
      'thinking... reading between lines.',
      'thinking... mapping the structure.'
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
      
      let response = `${mascot}\n\n`;
      response += `Reuse Score: ${String(analysis.reuseScore).padStart(3)}%\n`;
      response += `Verdict:     ${analysis.verdict.replace(/_/g, ' ')}\n`;

      if (analysis.verdict === 'ORIGINAL') {
        const originalVariants = [
          ['fresh structure.', 'clean history.', 'no obvious copying.', 'i like that.', 'confidence looks good on a project.'],
          ['original structure.', 'clean patterns.', 'nothing copied.', 'that\'s good.', 'originality shows.'],
          ['unique layout.', 'no reuse visible.', 'clean code.', 'i appreciate that.', 'originality matters.'],
          ['distinct structure.', 'no copying found.', 'clean history.', 'that works.', 'originality is clear.'],
          ['fresh patterns.', 'no reuse detected.', 'clean codebase.', 'i respect that.', 'originality stands out.']
        ];
        const variant = originalVariants[Math.floor(Math.random() * originalVariants.length)];
        response += '\n' + variant.join('\n');
      } else if (analysis.verdict === 'FORKED') {
        const forkVariants = [
          'this is a fork.\nnothing wrong with that.',
          'marked as a fork.\nthat\'s fine.',
          'it\'s a fork.\nacceptable.',
          'forked repository.\nnothing unusual.',
          'a fork.\nno problem.'
        ];
        response += '\n' + forkVariants[Math.floor(Math.random() * forkVariants.length)];
      } else if (analysis.verdict === 'HEAVILY_REUSED') {
        const reusedVariants = [
          'this code has been around.\na lot.',
          'heavy reuse detected.\nvery familiar.',
          'this code is reused.\nextensively.',
          'familiar patterns.\nheavily reused.',
          'this has been used.\nmany times.'
        ];
        response += '\n' + reusedVariants[Math.floor(Math.random() * reusedVariants.length)];
      } else {
        const stolenVariants = [
          ['this code feels familiar.', 'same structure.', 'same habits.', 'same little mistakes.', 'it\'s been around.', 'and it wasn\'t loyal.', 'originality matters.', 'in code — and in trust.'],
          ['familiar patterns.', 'same structure.', 'same mistakes.', 'this isn\'t original.', 'it\'s been copied.', 'without credit.', 'originality matters.', 'trust requires it.'],
          ['this feels copied.', 'same structure.', 'same patterns.', 'same errors.', 'it\'s been around.', 'not as original.', 'originality matters.', 'so does trust.'],
          ['familiar code.', 'same layout.', 'same habits.', 'same flaws.', 'been used before.', 'not original.', 'originality counts.', 'trust depends on it.'],
          ['this looks copied.', 'same structure.', 'same patterns.', 'same mistakes.', 'it\'s familiar.', 'too familiar.', 'originality matters.', 'trust needs it.']
        ];
        const variant = stolenVariants[Math.floor(Math.random() * stolenVariants.length)];
        response += '\n' + variant.join('\n');
      }

      const formattedResponse = formatResponse(response);
      await ctx.reply(`\`\`\`\n${formattedResponse}\n\`\`\``, { parse_mode: 'Markdown', ...replyOptions });
    } catch (error) {
      const errorMsg = formatResponse(getError());
      await ctx.reply(errorMsg, replyOptions);
    }
  };
}
