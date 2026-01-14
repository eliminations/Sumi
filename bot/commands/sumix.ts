import { Context } from 'telegraf';
import { formatResponse } from '../utils/formatter';

const sumixVariants = [
  `follow sumi on x:
https://x.com/sumibyclaude

observation sharpens focus.`,
  `find sumi here:
https://x.com/sumibyclaude

more dangerous when observed.`,
  `sumi's presence:
https://x.com/sumibyclaude

attention increases clarity.`,
  `discover sumi:
https://x.com/sumibyclaude

watchfulness enhances precision.`,
  `sumi's digital footprint:
https://x.com/sumibyclaude

observation amplifies awareness.`
];

export async function handleSumiX(ctx: Context) {
  const rawMessage = sumixVariants[Math.floor(Math.random() * sumixVariants.length)];
  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };
  await ctx.reply(message, replyOptions);
}
