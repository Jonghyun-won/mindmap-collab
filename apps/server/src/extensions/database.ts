import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export const database = new Database({
  fetch: async ({ documentName }) => {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('ydoc_snapshot')
        .eq('id', documentName)
        .single();

      if (error || !data || !data.ydoc_snapshot) {
        return null;
      }

      // Convert base64 to Uint8Array if needed
      if (typeof data.ydoc_snapshot === 'string') {
        return Buffer.from(data.ydoc_snapshot, 'base64');
      }

      return data.ydoc_snapshot;
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  },

  store: async ({ documentName, state }) => {
    try {
      // Convert Uint8Array to base64 for storage
      const snapshot = Buffer.from(state).toString('base64');

      const { error } = await supabase
        .from('mind_maps')
        .update({
          ydoc_snapshot: snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentName);

      if (error) {
        console.error('Error storing document:', error);
      }
    } catch (error) {
      console.error('Error storing document:', error);
    }
  },
});
