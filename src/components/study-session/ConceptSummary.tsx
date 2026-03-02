interface Topic {
  id: string;
  name: string;
  keyPoints: string[];
}

interface ConceptSummaryProps {
  newTopics: Topic[];
  reviewTopics: Topic[];
  onNext: () => void;
  onBack: () => void;
}

export function ConceptSummary({
  newTopics,
  reviewTopics,
  onNext,
  onBack,
}: ConceptSummaryProps) {
  return (
    <div className="p-6 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Today's Concepts</h1>
        <p className="text-gray-600 text-sm">
          Review what you'll be learning today
        </p>
      </div>

      {/* New Topics */}
      {newTopics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-primary-600 mb-4 flex items-center">
            <span className="text-2xl mr-2">🌟</span>
            New Topics ({newTopics.length})
          </h2>
          <div className="space-y-3">
            {newTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border-l-4 border-primary-500"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {topic.name}
                </h3>
                <ul className="space-y-1">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex">
                      <span className="mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Topics */}
      {reviewTopics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Review Topics ({reviewTopics.length})
          </h2>
          <div className="space-y-3">
            {reviewTopics.map((topic) => (
              <div
                key={topic.id}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {topic.name}
                </h3>
                <ul className="space-y-1">
                  {topic.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex">
                      <span className="mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold active:scale-95 transition-transform"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
        >
          Start Flashcards
        </button>
      </div>
    </div>
  );
}
