import { db } from '@/db/client';
import { conversations, prompts, collections, items } from '@/db/schema';
import { desc, eq, and, isNull } from 'drizzle-orm';
import { Studio } from '@/components/Studio';

export const dynamic = 'force-dynamic';

export interface PromptWithState {
  prompt: typeof prompts.$inferSelect;
  activeCollection: typeof collections.$inferSelect | null;
  pendingCollection: typeof collections.$inferSelect | null;
  activeItems: (typeof items.$inferSelect)[];
  totalVersions: number;
}

export interface ConversationWithPrompts {
  conversation: typeof conversations.$inferSelect;
  prompts: PromptWithState[];
}

export default async function Home() {
  const allConversations = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));

  const conversationsWithData = await Promise.all(
    allConversations.map(async (conversation) => {
      const conversationPrompts = await db
        .select()
        .from(prompts)
        .where(eq(prompts.conversationId, conversation.id))
        .orderBy(desc(prompts.createdAt));

      const promptsWithMeta = await Promise.all(
        conversationPrompts.map(async (prompt) => {
          // Most recent completed collection = the "active" one
          const [activeCollection] = await db
            .select()
            .from(collections)
            .where(
              and(
                eq(collections.promptId, prompt.id),
                eq(collections.status, 'completed')
              )
            )
            .orderBy(desc(collections.createdAt))
            .limit(1);

          // Any in-flight generation
          const [pendingCollection] = await db
            .select()
            .from(collections)
            .where(
              and(
                eq(collections.promptId, prompt.id),
                eq(collections.status, 'pending')
              )
            )
            .limit(1);

          // Items for the active collection (excluding soft-deleted)
          let activeItems: (typeof items.$inferSelect)[] = [];
          if (activeCollection) {
            activeItems = await db
              .select()
              .from(items)
              .where(
                and(
                  eq(items.collectionId, activeCollection.id),
                  isNull(items.deletedAt)
                )
              );
          }

          // Total number of generation runs for this prompt
          const allCollections = await db
            .select({ id: collections.id })
            .from(collections)
            .where(eq(collections.promptId, prompt.id));

          return {
            prompt,
            activeCollection: activeCollection ?? null,
            pendingCollection: pendingCollection ?? null,
            activeItems,
            totalVersions: allCollections.length,
          };
        })
      );

      return {
        conversation,
        prompts: promptsWithMeta,
      };
    })
  );

  return <Studio initialData={conversationsWithData} />;
}
