import { Context } from 'telegraf';
import { formatResponse } from '../utils/formatter';

const sumigitVariants = [
  `https://github.com/eliminations/Sumi

source is visible.`,
  `https://github.com/eliminations/Sumi

code is open.`,
  `https://github.com/eliminations/Sumi

implementation available.`,
  `https://github.com/eliminations/Sumi

you can inspect it.`,
  `https://github.com/eliminations/Sumi

read if you want.`
];

export async function handleSumiGit(ctx: Context) {
  const rawMessage = sumigitVariants[Math.floor(Math.random() * sumigitVariants.length)];
  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };
  await ctx.reply(message, replyOptions);
}
