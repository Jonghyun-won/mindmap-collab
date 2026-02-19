import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MindMap } from '../types/mindmap';
import Header from '../components/Layout/Header';
import { User } from '../types/user';

interface HomePageProps {
  user: User;
}

export default function HomePage({ user }: HomePageProps) {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMindMaps();
  }, []);

  const loadMindMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMindMaps(data || []);
    } catch (error) {
      console.error('Error loading mind maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMindMap = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .insert({
          title: 'Untitled Mind Map',
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/editor/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating mind map:', error);
      alert('Failed to create mind map. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Mind Maps</h2>
          <button
            onClick={createMindMap}
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : '+ New Mind Map'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : mindMaps.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No mind maps yet</p>
            <button
              onClick={createMindMap}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create your first mind map
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mindMaps.map((mindMap) => (
              <div
                key={mindMap.id}
                onClick={() => navigate(`/editor/${mindMap.id}`)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {mindMap.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Updated {new Date(mindMap.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
