import { describe, it, expect } from 'vitest';
import { buildStudyPlanPrompt } from '../studyPlanPrompt';

describe('buildStudyPlanPrompt', () => {
  it('includes daysAvailable and content in the prompt', () => {
    const prompt = buildStudyPlanPrompt({ content: 'Study material', daysAvailable: 7 });
    expect(prompt).toContain('7');
    expect(prompt).toContain('Study material');
  });

  it('truncates content to 15000 characters', () => {
    const longContent = 'x'.repeat(20000);
    const prompt = buildStudyPlanPrompt({ content: longContent, daysAvailable: 3 });
    // 15000 x's should appear, but 15001st should not
    expect(prompt).toContain('x'.repeat(15000));
    expect(prompt).not.toContain('x'.repeat(15001));
  });

  it('defaults minutesPerDay to 30 when not provided', () => {
    const prompt = buildStudyPlanPrompt({ content: 'material', daysAvailable: 5 });
    expect(prompt).toContain('30');
  });

  it('uses provided minutesPerDay', () => {
    const prompt = buildStudyPlanPrompt({ content: 'material', daysAvailable: 5, minutesPerDay: 45 });
    expect(prompt).toContain('45');
  });

  it('instructs the model to only schedule up to daysAvailable', () => {
    const prompt = buildStudyPlanPrompt({ content: 'x', daysAvailable: 10 });
    expect(prompt).toContain('days 1 through 10');
  });
});
