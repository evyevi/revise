import { Layout } from '../components/Layout';

export function Profile() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p className="text-gray-600">Your stats and badges will appear here.</p>
      </div>
    </Layout>
  );
}
