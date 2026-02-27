import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export function parseDocumentName(documentName: string): {
  mindmapId: string;
  chapterId: string | null;
} {
  const parts = documentName.split(':');

  if (parts.length === 2) {
    // New format: "mindmap_id:chapter_id"
    return {
      mindmapId: parts[0],
      chapterId: parts[1],
    };
  } else {
    // Legacy format: "mindmap_id" (default to first chapter)
    return {
      mindmapId: documentName,
      chapterId: null,
    };
  }
}

export const database = new Database({
  fetch: async ({ documentName }) => {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    try {
      if (chapterId) {
        // New: Fetch from chapters table
        const { data, error } = await supabase
          .from('chapters')
          .select('yjs_state')
          .eq('mindmap_id', mindmapId)
          .eq('id', chapterId)
          .single();

        if (error || !data || !data.yjs_state) {
          return null;
        }

        if (typeof data.yjs_state === 'string') {
          return Buffer.from(data.yjs_state, 'base64');
        }

        return data.yjs_state;
      } else {
        // Legacy: Fetch from mindmaps table
        const { data, error } = await supabase
          .from('mindmaps')
          .select('yjs_state')
          .eq('id', mindmapId)
          .single();

        if (error || !data || !data.yjs_state) {
          return null;
        }

        if (typeof data.yjs_state === 'string') {
          return Buffer.from(data.yjs_state, 'base64');
        }

        return data.yjs_state;
      }
    } catch (error) {
      console.error(`Failed to fetch Yjs state for ${documentName}:`, error);
      return null;
    }
  },

  store: async ({ documentName, state }) => {
    const { mindmapId, chapterId } = parseDocumentName(documentName);

    try {
      // Convert Uint8Array to base64 for storage
      const snapshot = Buffer.from(state).toString('base64');

      if (chapterId) {
        // New: Store to chapters table
        const { error } = await supabase
          .from('chapters')
          .update({
            yjs_state: snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq('mindmap_id', mindmapId)
          .eq('id', chapterId);

        if (error) {
          console.error(`Failed to store Yjs state for ${documentName}:`, error);
        }
      } else {
        // Legacy: Store to mindmaps table
        const { error } = await supabase
          .from('mindmaps')
          .update({
            yjs_state: snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mindmapId);

        if (error) {
          console.error(`Failed to store Yjs state for ${documentName}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to store Yjs state for ${documentName}:`, error);
    }
  },
});
