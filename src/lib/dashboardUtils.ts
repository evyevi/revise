import type { Flashcard, MasteryLevel } from '../types';
import { deriveClampedMasteryLevel } from './sm2Calculator';

/**
 * Get mastery level from a flashcard, prioritizing SM-2 data over legacy masteryLevel
 */
export function getMasteryFromCard(card: Flashcard): MasteryLevel {
  if (card.easinessFactor !== undefined) {
    return deriveClampedMasteryLevel(card.easinessFactor);
  }
  return card.masteryLevel;
}

/**
 * Format interval in days as human-readable string
 */
export function formatInterval(days: number | undefined): string {
  if (days === undefined) return 'Not scheduled';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  if (days < 28) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/**
 * Get due status for a card based on nextReviewDate
 */
export function getDueStatus(nextReviewDate: Date | undefined): string {
  if (!nextReviewDate) return 'Not scheduled';
  
  const now = new Date();
  const reviewDate = new Date(nextReviewDate);
  
  // Normalize to start of day for comparison
  now.setHours(0, 0, 0, 0);
  reviewDate.setHours(0, 0, 0, 0);
  
  const diffMs = reviewDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Due now';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  return 'Not due yet';
}

/**
 * Get category label for easiness factor
 */
export function getEFCategory(ef: number | undefined): string {
  if (ef === undefined) return 'Legacy card';
  if (ef >= 2.4) return 'Very Easy';
  if (ef >= 2.2) return 'Easy';
  if (ef >= 1.9) return 'Good';
  if (ef >= 1.6) return 'Moderate';
  return 'Hard';
}

/**
 * Check if a card is due for review
 */
export function isCardDue(nextReviewDate: Date | undefined): boolean {
  if (!nextReviewDate) return false;
  
  const now = new Date();
  const reviewDate = new Date(nextReviewDate);
  
  // Normalize to start of day for comparison
  now.setHours(0, 0, 0, 0);
  reviewDate.setHours(0, 0, 0, 0);
  
  return reviewDate <= now;
}

/**
 * Format days until review (negative means overdue)
 */
export function getDaysUntilReview(nextReviewDate: Date | undefined): number | null {
  if (!nextReviewDate) return null;
  
  const now = new Date();
  const reviewDate = new Date(nextReviewDate);
  
  // Normalize to start of day for comparison
  now.setHours(0, 0, 0, 0);
  reviewDate.setHours(0, 0, 0, 0);
  
  const diffMs = reviewDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get interval range category for grouping
 */
export function getIntervalRange(interval: number | undefined): string {
  if (interval === undefined) return 'Not scheduled';
  if (interval < 7) return '1-6 days';
  if (interval < 14) return '1-2 weeks';
  if (interval < 28) return '2-4 weeks';
  return '4+ weeks';
}
