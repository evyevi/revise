import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function StudySession() {
  const { planId, dayId } = useParams<{ planId?: string; dayId?: string }>();
  
  return (
    <Layout showBottomNav={false}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Study Session</h1>
        {planId && dayId && (
          <p className="text-gray-600">
            Plan: {planId} • Day: {dayId}
          </p>
        )}
      </div>
    </Layout>
  );
}
