import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Layout/Header';
import MindMapCanvas from '../components/MindMap/MindMapCanvas';
import TitleEditor from '../components/MindMap/TitleEditor';
import { User } from '../types/user';
import { supabase } from '../lib/supabase';

interface EditorPageProps {
  user: User;
}

export default function EditorPage({ user }: EditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const [mindMapTitle, setMindMapTitle] = useState('Untitled Mind Map');
  const [isSaving, setIsSaving] = useState(false);

  // Load mind map title
  useEffect(() => {
    if (id) {
      loadMindMapTitle(id);
    }
  }, [id]);

  const loadMindMapTitle = async (mindMapId: string) => {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('title')
        .eq('id', mindMapId)
        .single();

      if (error) throw error;
      if (data) {
        setMindMapTitle(data.title);
      }
    } catch (error) {
      console.error('Error loading title:', error);
    }
  };

  const handleTitleSave = async (newTitle: string) => {
    if (!id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({ title: newTitle })
        .eq('id', id);

      if (error) throw error;
      setMindMapTitle(newTitle);
      console.log('✅ Title saved:', newTitle);
    } catch (error) {
      console.error('Error saving title:', error);
      alert('제목 저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header
        user={user}
        title={
          <TitleEditor
            initialTitle={mindMapTitle}
            onSave={handleTitleSave}
            isSaving={isSaving}
          />
        }
        showBackButton
      />
      <main className="flex-1">
        <MindMapCanvas mindMapTitle={mindMapTitle} />
      </main>
    </div>
  );
}
