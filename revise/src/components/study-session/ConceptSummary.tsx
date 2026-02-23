interface ConceptSummaryProps {
  newTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  reviewTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  onNext: () => void;
  onBack: () => void;
}

export function ConceptSummary({ newTopics, reviewTopics, onNext, onBack }: ConceptSummaryProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Today's Concepts</h2>
      
      {newTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-primary-600">New Topics</h3>
          <ul className="space-y-2">
            {newTopics.map((topic) => (
              <li key={topic.id} className="bg-primary-50 p-3 rounded-lg">
                <p className="font-medium">{topic.name}</p>
                <ul className="mt-1 ml-4 text-sm text-gray-600">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviewTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-orange-600">Review Topics</h3>
          <ul className="space-y-2">
            {reviewTopics.map((topic) => (
              <li key={topic.id} className="bg-orange-50 p-3 rounded-lg">
                <p className="font-medium">{topic.name}</p>
                <ul className="mt-1 ml-4 text-sm text-gray-600">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-xl font-semibold"
        >
          Start Flashcards
        </button>
      </div>
    </div>
  );
}
