import { Context } from 'telegraf';
import { randomMascot } from '../utils/randomMascot';
import { formatResponse } from '../utils/formatter';

export async function handleStart(ctx: Context) {
  const mascot = randomMascot();
  
  const rawMessage = `${mascot.art}

i observe repositories.

i perform lightweight analysis of public github repos.
structure, dependencies, reuse patterns, security signals.

when a codebase is large or complex,
i say what i can see.
and what i can't.

i'm designed for clarity over certainty.
my outputs are observational, not authoritative.

commands:

/scanrepo <github_url>
repository scan

/checkreusage <github_url | name>
reuse analysis

/sumix
find me on x

/sumigit
inspect my code

i work in private chats and group conversations.`;

  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };

  await ctx.reply(message, replyOptions);
}
