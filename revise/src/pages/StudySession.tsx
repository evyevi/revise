import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useStudySession } from '../hooks/useStudySession';
import { ConceptSummary } from '../components/study-session/ConceptSummary';
import { FlashcardDeck } from '../components/study-session/FlashcardDeck';
import { QuizScreen } from '../components/study-session/QuizScreen';
import { CompletionScreen } from '../components/study-session/CompletionScreen';

export function StudySession() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const session = useStudySession(planId || '');

  if (!planId) {
    return (
      <Layout showBottomNav={false}>
        <div className="p-6 text-center">
          <p className="text-red-600">Invalid study plan</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-primary-500 text-white py-2 px-4 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  if (session.step === 'loading') {
    return (
      <Layout showBottomNav={false}>
        <LoadingSpinner message="Loading your study session..." />
      </Layout>
    );
  }

  if (session.step === 'error') {
    return (
      <Layout showBottomNav={false}>
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{session.error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-500 text-white py-2 px-4 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="max-w-lg mx-auto">
        {session.step === 'concepts' && (
          <ConceptSummary
            newTopics={session.newTopics}
            reviewTopics={session.reviewTopics}
            onNext={session.advanceStep}
            onBack={() => navigate('/')}
          />
        )}

        {session.step === 'flashcards' && (
          <FlashcardDeck
            cards={session.flashcards}
            currentIndex={session.currentFlashcardIndex}
            onNext={() => {
              if (session.currentFlashcardIndex < session.flashcards.length - 1) {
                session.nextFlashcard();
              } else {
                session.advanceStep();
              }
            }}
            onPrev={session.prevFlashcard}
            onSkip={session.advanceStep}
          />
        )}

        {session.step === 'quiz' && (
          <QuizScreen
            quizzes={session.quizzes}
            currentIndex={session.currentQuizIndex}
            answers={session.quizAnswers}
            onAnswer={session.answerQuiz}
            onNext={() => {
              if (session.currentQuizIndex < session.quizzes.length - 1) {
                session.nextQuiz();
              } else {
                // Calculate XP and complete session
                const correct = Array.from(session.quizAnswers.entries()).filter(
                  ([quizId, answerIndex]) => {
                    const quiz = session.quizzes.find((q) => q.id === quizId);
                    return quiz && quiz.correctAnswerIndex === answerIndex;
                  }
                ).length;

                const quizCount = session.quizzes.length;
                const baseXP = 50;
                const correctXP = (correct / quizCount) * 50;
                const totalXP = Math.round(baseXP + correctXP);

                session.completeSession(totalXP);
              }
            }}
            onPrev={session.prevQuiz}
          />
        )}

        {session.step === 'completion' && (
          <CompletionScreen
            xpEarned={session.xpEarned}
            quizScore={
              session.quizzes.length > 0
                ? (Array.from(session.quizAnswers.values()).filter(
                    (_, idx) =>
                      session.quizzes[idx]?.correctAnswerIndex ===
                      session.quizAnswers.get(session.quizzes[idx]?.id || '')
                  ).length / session.quizzes.length) * 100
                : 0
            }
            onHome={() => navigate('/')}
          />
        )}
      </div>
    </Layout>
  );
}
