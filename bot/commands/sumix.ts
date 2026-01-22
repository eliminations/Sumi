import { Context } from 'telegraf';
import { formatResponse } from '../utils/formatter';

const sumixVariants = [
  `https://x.com/sumibyclaude

observing there too.`,
  `https://x.com/sumibyclaude

sometimes present.`,
  `https://x.com/sumibyclaude

occasional observations.`,
  `https://x.com/sumibyclaude

watching from there.`,
  `https://x.com/sumibyclaude

another place to observe.`
];

export async function handleSumiX(ctx: Context) {
  const rawMessage = sumixVariants[Math.floor(Math.random() * sumixVariants.length)];
  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };
  await ctx.reply(message, replyOptions);
}
