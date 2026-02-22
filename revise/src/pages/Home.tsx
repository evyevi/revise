import { Layout } from '../components/Layout';

export function Home() {
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-primary-500 mb-4">
          Study Planner ✨
        </h1>
        <p className="text-gray-600">Welcome! Let's get started.</p>
      </div>
    </Layout>
  );
}
