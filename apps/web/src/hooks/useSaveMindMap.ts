import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as Y from 'yjs';

export function useSaveMindMap() {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveMindMap = useCallback(async (
    mindMapId: string,
    title: string,
    ydoc: Y.Doc | null
  ) => {
    if (!ydoc) {
      console.error('❌ No Yjs document to save');
      return { success: false, error: 'No document' };
    }

    setIsSaving(true);
    console.log('💾 Saving mind map...', { mindMapId, title });

    try {
      // Encode Y.Doc to binary
      const state = Y.encodeStateAsUpdate(ydoc);
      console.log('📦 Encoded state size:', state.length, 'bytes');

      // Convert to base64 for storage
      const snapshot = btoa(String.fromCharCode(...Array.from(state)));
      console.log('📦 Base64 snapshot size:', snapshot.length, 'characters');

      // Update in Supabase
      const { data, error } = await supabase
        .from('mind_maps')
        .update({
          ydoc_snapshot: snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mindMapId)
        .select();

      if (error) {
        console.error('❌ Save error:', error);
        return { success: false, error: error.message };
      }

      setLastSaved(new Date());
      console.log('✅ Mind map saved successfully', data);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Save error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const autoSave = useCallback(async (
    mindMapId: string,
    title: string,
    ydoc: Y.Doc | null
  ) => {
    // Auto-save without blocking UI
    saveMindMap(mindMapId, title, ydoc);
  }, [saveMindMap]);

  return {
    saveMindMap,
    autoSave,
    isSaving,
    lastSaved,
  };
}
