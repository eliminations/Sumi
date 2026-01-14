import { Context } from 'telegraf';
import { formatResponse } from '../utils/formatter';

const sumigitVariants = [
  `sumi's source:
https://github.com/eliminations/Sumi

code reveals truth.`,
  `find sumi's code:
https://github.com/eliminations/Sumi

transparency builds trust.`,
  `sumi's repository:
https://github.com/eliminations/Sumi

open source, open scrutiny.`,
  `sumi's codebase:
https://github.com/eliminations/Sumi

inspect what you trust.`,
  `sumi on github:
https://github.com/eliminations/Sumi

read the implementation.`
];

export async function handleSumiGit(ctx: Context) {
  const rawMessage = sumigitVariants[Math.floor(Math.random() * sumigitVariants.length)];
  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };
  await ctx.reply(message, replyOptions);
}
