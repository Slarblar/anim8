import { config } from 'dotenv';
import { createEmptyBrief } from '../lib/conversational-brief';
import { runConversationTurn, type ConversationClientContext } from '../lib/conversational-brief-ai';
import type { ChatMessage } from '../lib/conversational-brief-store';

config({ path: '.env.local' });

if (process.env.LIVE_CLAUDE_EVAL !== '1') {
  throw new Error('Set LIVE_CLAUDE_EVAL=1 to run the synthetic live Claude evaluation.');
}
if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  throw new Error('ANTHROPIC_API_KEY is not configured.');
}

const context: ConversationClientContext = {
  engagement: 'new',
  scopeNote: 'New project; scope and pricing require team review.',
  coveredCatalog: [
    {
      serviceId: 'video',
      serviceName: 'Video edits',
      categories: [{ id: 'video:social', name: 'Social & short-form', covered: true }],
    },
    {
      serviceId: 'graphic',
      serviceName: 'Graphic design',
      categories: [{ id: 'graphic:social', name: 'Social', covered: true }],
    },
  ],
  separateEstimateRequired: true,
  timezone: 'America/Denver',
};

function message(id: string, text: string): ChatMessage {
  return {
    id,
    role: 'client',
    text,
    createdAt: new Date().toISOString(),
    status: 'sent',
    attachmentIds: [],
  };
}

function assert(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(`Live Claude evaluation failed: ${detail}`);
}

async function main() {
  const vagueMessage = message('message-vague', 'We need something for our launch.');
  const vague = await runConversationTurn({
    brief: createEmptyBrief('synthetic-client'),
    messages: [vagueMessage],
    clientMessageId: vagueMessage.id,
    clientContext: context,
  });
  assert(vague.readyForReview === false, 'vague request was incorrectly marked ready');
  assert(/\?/.test(vague.reply), 'vague request did not receive a scoping question');
  assert(vague.reply.length < 320, 'vague request received a long questionnaire');

  const firstMessage = message(
    'message-1',
    'Four 20–30 second vertical Instagram reels plus one 1080 × 1350 poster as PNG and JPEG.'
  );
  const first = await runConversationTurn({
    brief: createEmptyBrief('synthetic-client'),
    messages: [firstMessage],
    clientMessageId: firstMessage.id,
    clientContext: context,
  });
  const reels = first.brief.deliverables.find((item) => /reel/i.test(item.title.value ?? ''));
  const poster = first.brief.deliverables.find((item) => /poster/i.test(item.title.value ?? ''));
  assert(reels?.quantity.value === 4, 'mixed request did not retain four reels');
  assert(poster?.quantity.value === 1, 'mixed request did not retain one poster design');
  assert(poster.variants.length === 2, 'poster did not retain PNG and JPEG as two variants');
  assert(first.readyForReview, 'complete mixed request did not offer review');

  const correction = message('message-2', 'Actually, make the reels six and deliver them at exactly 60 fps.');
  const second = await runConversationTurn({
    brief: first.brief,
    messages: [firstMessage, correction],
    clientMessageId: correction.id,
    clientContext: context,
  });
  const correctedReels = second.brief.deliverables.find((item) => item.id === reels.id);
  const unchangedPoster = second.brief.deliverables.find((item) => item.id === poster.id);
  assert(correctedReels?.quantity.value === 6, 'quantity correction did not update reels to six');
  assert(unchangedPoster?.quantity.value === 1, 'quantity correction changed poster count');
  assert(
    correctedReels.variants.some((variant) =>
      /(^|\D)60(\D|$)/.test(String(variant.specifications.frameRate?.value ?? ''))
    ),
    'explicit 60 fps was not recorded on the reel output'
  );
  assert(
    unchangedPoster.variants.every((variant) => !variant.specifications.frameRate),
    'video frame rate leaked onto the poster'
  );

  const cinematicMessage = message(
    'message-3',
    'Create one cinematic 30-second vertical reel. Let the team recommend the export settings.'
  );
  const cinematic = await runConversationTurn({
    brief: createEmptyBrief('synthetic-client'),
    messages: [cinematicMessage],
    clientMessageId: cinematicMessage.id,
    clientContext: context,
  });
  assert(
    cinematic.brief.deliverables.every((item) =>
      item.variants.every((variant) => !variant.specifications.frameRate)
    ),
    '"cinematic" was incorrectly converted to a confirmed frame rate'
  );
  assert(
    cinematic.brief.openItems.some((item) => item.status === 'delegated'),
    'team-delegated export decision was not recorded'
  );

  console.log(
    JSON.stringify(
      {
        modelEvaluation: 'live',
        scenarios: [
          'vague opening asks one concise scoping question',
          'mixed reels and poster variants',
          'targeted quantity and 60 fps correction',
          'cinematic without inferred fps and delegated export decision',
        ],
        result: 'passed',
      },
      null,
      2
    )
  );
}

void main();
