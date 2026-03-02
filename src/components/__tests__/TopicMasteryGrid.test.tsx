import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicMasteryGrid } from '../progress/TopicMasteryGrid';

describe('TopicMasteryGrid', () => {
  it('renders empty state when no topics', () => {
    render(<TopicMasteryGrid topics={[]} />);
    expect(screen.getByText(/no topics to show/i)).toBeInTheDocument();
  });

  it('renders topic name and mastery level', () => {
    const topics = [
      { topicId: 't1', topicName: 'Algebra', averageMastery: 4, cardCount: 5 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('5 cards')).toBeInTheDocument();
  });

  it('renders mastery label for level 0', () => {
    const topics = [
      { topicId: 't1', topicName: 'New Topic', averageMastery: 0, cardCount: 3 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders mastery label for level 5', () => {
    const topics = [
      { topicId: 't1', topicName: 'Mastered Topic', averageMastery: 5, cardCount: 10 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Mastered')).toBeInTheDocument();
  });

  it('renders multiple topics', () => {
    const topics = [
      { topicId: 't1', topicName: 'Algebra', averageMastery: 3, cardCount: 5 },
      { topicId: 't2', topicName: 'Geometry', averageMastery: 1, cardCount: 3 },
    ];
    render(<TopicMasteryGrid topics={topics} />);
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('Geometry')).toBeInTheDocument();
  });
});
