import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Celebration } from '../Celebration';
import { BadgeUnlock } from '../BadgeUnlock';
import { getBadgeMetadata, BadgeType } from '../../lib/badgeService';

interface CompletionScreenProps {
  xpEarned: number;
  newBadges?: BadgeType[];
  streakBonus?: number;
  currentStreak?: number;
  onContinue: () => void;
}

export const CompletionScreen = React.memo(function CompletionScreen({
  xpEarned,
  newBadges,
  streakBonus,
  currentStreak,
  onContinue,
}: CompletionScreenProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  const [badgeIndex, setBadgeIndex] = useState(0);

  // Handle badge unlock flow
  const hasNewBadges = newBadges && newBadges.length > 0;
  const showingBadge = hasNewBadges && badgeIndex < newBadges.length;

  const handleBadgeNext = () => {
    if (badgeIndex < newBadges!.length - 1) {
      setBadgeIndex(badgeIndex + 1);
    } else {
      // All badges shown, proceed to main screen
      setBadgeIndex(newBadges!.length);
    }
  };

  // If showing badges, render badge unlock overlay
  if (showingBadge) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
        <BadgeUnlock badgeId={newBadges![badgeIndex]} duration={3} />
        <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
          <button
            onClick={handleBadgeNext}
            className="w-full bg-white text-primary-500 py-4 px-6 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-lg"
          >
            {badgeIndex < newBadges!.length - 1 ? 'Next Badge' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 flex flex-col min-h-screen items-center justify-center text-center">
      {/* Celebration animation */}
      {showCelebration && (
        <div data-testid="celebration">
          <Celebration type="confetti" duration={3000} />
        </div>
      )}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Celebration emoji */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Complete!</h1>

        <p className="text-gray-600 mb-8">You're doing amazing!</p>

        {/* XP Summary Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl p-6 mb-6 w-full"
        >
          <p className="text-sm text-gray-600 mb-4 font-semibold">Session Summary</p>
          
          {/* Session Rewards */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700">Session Rewards</span>
            <span className="text-xl font-bold text-primary-600">
              ♥ +{xpEarned} XP
            </span>
          </div>

          {/* Streak Bonus */}
          {streakBonus && streakBonus > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700">Streak Bonus</span>
              <span className="text-xl font-bold text-primary-600">
                🔥 +{streakBonus} XP
              </span>
            </div>
          )}

          {/* Current Streak */}
          {currentStreak && currentStreak > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-primary-200">
              <span className="text-gray-700 font-semibold">Current Streak</span>
              <span className="text-xl font-bold text-orange-500">
                🔥 {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
        </motion.div>

        {/* New Badges Display */}
        {hasNewBadges && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-6 mb-6 w-full"
          >
            <p className="text-sm text-gray-600 mb-3 font-semibold">New Badges Unlocked!</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {newBadges.map((badgeId) => {
                const badge = getBadgeMetadata(badgeId);
                return badge ? (
                  <motion.div
                    key={badgeId}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.6 }}
                    className="flex items-center bg-white rounded-full px-3 py-2 shadow-sm"
                  >
                    <span className="text-2xl mr-2">{badge.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {badge.name}
                    </span>
                  </motion.div>
                ) : null;
              })}
            </div>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onContinue}
          className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl font-bold text-lg active:scale-95 transition-transform mt-4"
        >
          See you tomorrow! 👋
        </motion.button>
      </motion.div>
    </div>
  );
});
