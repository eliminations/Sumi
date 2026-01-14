import { Context } from 'telegraf';
import { randomMascot } from '../utils/randomMascot';
import { formatResponse } from '../utils/formatter';

export async function handleStart(ctx: Context) {
  const mascot = randomMascot();
  
  const rawMessage = `${mascot.art}

Sumi has arrived.

I read GitHub repos slowly.
Line by line.
Until they confess.

I expose security risks.
I uncover stolen Web3 code.
I tell you who's safe to trust.

Whisper a command to me:

/checkgitrepo <github_url>
I'll judge its security.

/checkreusage <github_url | project_name>
I'll tell you if it's been unfaithful.

/sumix
Follow me on X.

/sumigit
Inspect my code.

Now.
Show me the code, darling.`;

  const message = formatResponse(rawMessage);
  const replyOptions = {
    reply_to_message_id: ctx.message.message_id
  };

  await ctx.reply(message, replyOptions);
}
