# SM-2 Spaced Repetition Guide

**A complete guide to understanding and using the SM-2 algorithm in Revise**

---

## What is Spaced Repetition?

Spaced repetition is a learning technique that increases the intervals of time between study sessions as your memory strengthens. Instead of cramming the same material repeatedly, you review it just before you're about to forget it—maximizing retention while minimizing study time.

**Key Benefits:**
- **Better long-term retention**: Information moves to long-term memory
- **Efficient studying**: Focus on what you're about to forget, not what you know well
- **Less cramming**: Small, consistent reviews replace marathon sessions
- **Scientifically proven**: Based on research into human memory

---

## How SM-2 Works

SM-2 (SuperMemo 2) is a specific spaced repetition algorithm that calculates when you should review each flashcard based on how well you remember it.

### The Three Key Components

#### 1. **Easiness Factor (EF)**
- A number between 1.3 and 2.5 that represents how "easy" a card is for you
- Starts at 2.5 for new cards
- Increases when you rate a card "Easy"
- Decreases when you struggle with a card
- Determines how fast intervals grow

#### 2. **Interval (Days)**
- How many days until your next review
- Starts at 1 day for new cards
- Grows based on your performance:
  - **First correct answer**: 1 day
  - **Second correct answer**: 6 days
  - **Subsequent correct answers**: Previous interval × Easiness Factor
- Resets to 1 day if you rate "Again"

#### 3. **Repetitions**
- Counts how many times you've correctly reviewed the card in a row
- Resets to 0 when you rate "Again" or "Hard"
- Increases when you rate "Good" or "Easy"
- Determines which interval formula to use

### The Algorithm Formula

When you review a card and rate it, SM-2 calculates:

```
New EF = Old EF + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
```

Where `quality` is:
- 0 = Again
- 1 = Hard
- 2 = Good
- 3 = Easy

The EF is clamped between 1.3 (minimum) and 2.5 (maximum).

**Example:**
- Card has EF of 2.5 (default)
- You rate it "Good" (quality = 2)
- New EF = 2.5 + (0.1 - (3 - 2) * (0.08 + (3 - 2) * 0.02))
- New EF = 2.5 + (0.1 - 1 * 0.1) = 2.5 (stays the same)

Rating "Easy" increases EF, making future intervals longer. Rating "Again" decreases EF significantly.

---

## Understanding Quality Ratings

When you review a flashcard, you rate how well you remembered it using one of four buttons:

### 🔴 Again (Quality 0)
**When to use:** You completely forgot the answer or got it wrong.

**What happens:**
- Repetitions reset to 0
- Next review: Tomorrow (1 day)
- Easiness Factor decreases significantly
- Card will appear more frequently

**Example:** "What is photosynthesis?" → You have no idea or give a completely wrong answer.

---

### 🟡 Hard (Quality 1)
**When to use:** You struggled significantly, took a long time, or were mostly wrong but eventually recalled the correct answer.

**What happens:**
- Repetitions reset to 0
- Next review: Tomorrow (1 day)
- Easiness Factor decreases slightly
- Card treated as "mostly forgotten"

**Example:** "What is photosynthesis?" → You eventually remember it involves plants and light, but couldn't recall details without significant effort.

---

### 🟢 Good (Quality 2)
**When to use:** You remembered the answer, but it took some thought or you hesitated briefly.

**What happens:**
- Repetitions increase by 1
- Easiness Factor stays roughly the same (slight decrease)
- Interval increases based on schedule
- This is the most common rating

**Example:** "What is photosynthesis?" → You think for a moment, then correctly recall: "The process where plants convert light into energy."

---

### 🔵 Easy (Quality 3)
**When to use:** You recalled the answer instantly and perfectly with zero hesitation.

**What happens:**
- Repetitions increase by 1
- Easiness Factor increases
- Interval grows faster
- Card will appear less frequently

**Example:** "What is photosynthesis?" → You immediately answer: "The process by which plants use sunlight, water, and CO₂ to create glucose and oxygen."

---

## Reading Your Dashboard

The Progress Dashboard shows SM-2 statistics for each flashcard:

### Mastery Level
- **Color-coded** based on Easiness Factor:
  - 🟥 **Not Started**: Never reviewed (grey)
  - 🟧 **Learning**: EF < 1.8 (red/orange)
  - 🟨 **Familiar**: EF 1.8-2.1 (yellow)
  - 🟩 **Mastered**: EF > 2.1 (green)
- Derived from your Easiness Factor
- Higher EF = Higher mastery

### Interval
- **Days until next review**
- Shows how confident the algorithm is about your memory
- Longer intervals mean stronger memory

### Due Status
- **"Due for review"**: next review date ≤ today
- **"Upcoming"**: next review date > today
- Review due cards first for optimal learning

### Next Review Date
- Exact date and time of your next scheduled review
- Automatically calculated after each session

---

## Tips for Success

### 1. **Be Honest with Your Ratings**
The algorithm only works if you're truthful:
- Don't rate "Easy" just to see cards less often
- Don't rate "Again" if you actually remembered it
- Match your rating to your actual recall speed and accuracy

**Why it matters:** Inflated ratings = premature forgetting. Deflated ratings = wasted time.

---

### 2. **Review Consistently**
- Check your dashboard daily
- Review cards marked "Due for review"
- Consistency is more important than duration
- Even 5 minutes daily is better than 30 minutes once a week

**Why it matters:** Spaced repetition depends on timely reviews. Missing reviews means forgetting.

---

### 3. **Use the Due Count to Prioritize**
- Focus on cards marked as "due" first
- Don't worry about cards with future review dates
- The algorithm schedules cards optimally

**Why it matters:** Due cards are on the edge of being forgotten—review them now for maximum retention.

---

### 4. **Don't Skip Reviews**
- If you miss a due date, the card is still due
- The algorithm doesn't penalize you—just review when you can
- Skipping reviews multiple days in a row hurts retention

**Why it matters:** SM-2 assumes you review cards when they're due. Delays reduce effectiveness.

---

### 5. **Trust the Process**
- Intervals can feel long (30+ days for easy cards)
- This is normal and scientifically validated
- The algorithm knows when you're about to forget

**Why it matters:** Fighting the algorithm (reviewing too often) wastes time without improving retention.

---

### 6. **Use "Again" Liberally**
- Don't be afraid to reset a card
- It's better to over-review than under-review
- Cards you struggle with need more repetitions

**Why it matters:** False confidence leads to forgetting. Honest ratings lead to mastery.

---

### 7. **Review Before High-Stakes Events**
- Before a test, review all cards regardless of due date
- Use the dashboard to find weak spots (low EF cards)
- Focus extra time on "Learning" mastery level cards

**Why it matters:** SM-2 optimizes long-term retention, but you can supplement with targeted review for exams.

---

## Frequently Asked Questions

### Q: What if I have too many cards due?
**A:** This happens if you created many cards at once or missed several days. Review what you can today—the system will adapt. Consider spreading card creation over multiple days next time.

### Q: Can I change my rating after submitting?
**A:** Not currently. Be thoughtful when selecting a rating. If you make a mistake, it will self-correct over the next few reviews.

### Q: Why do some cards have very long intervals?
**A:** Cards you consistently rate "Good" or "Easy" grow intervals exponentially. A card with EF 2.5 reviewed 5 times correctly might have a 96-day interval. This is optimal for long-term retention.

### Q: Should I review cards before they're due?
**A:** Generally no. The algorithm schedules cards for when you're about to forget. Early reviews don't improve retention and waste time. Exception: before exams.

### Q: What if I know a card really well? Can I skip it?
**A:** No need—just rate it "Easy" when it comes up. It will quickly reach long intervals (weeks or months), and you'll rarely see it.

### Q: How do I reset a card completely?
**A:** Rate it "Again" multiple times. This will reset repetitions to 0 and lower the EF, bringing it back to the beginning of the schedule.

---

## Advanced: Understanding the SM-2 Formula

For those curious about the mathematics:

### Easiness Factor Update
```
EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
```
- `q` = quality rating (0-3)
- `EF` = current easiness factor
- `EF'` = new easiness factor (clamped to [1.3, 2.5])

### Interval Calculation
1. **If quality < 2** (Again or Hard):
   - Repetitions = 0
   - Interval = 1 day

2. **If quality ≥ 2** (Good or Easy):
   - Repetitions += 1
   - If repetitions = 1: Interval = 1 day
   - If repetitions = 2: Interval = 6 days
   - If repetitions > 2: Interval = previous interval × EF

### Example Progression (Rating "Good" every time)
| Review | Repetitions | Interval | Days from Start |
|--------|-------------|----------|-----------------|
| 1      | 1           | 1 day    | Day 0           |
| 2      | 2           | 6 days   | Day 1           |
| 3      | 3           | 15 days  | Day 7           |
| 4      | 4           | 37 days  | Day 22          |
| 5      | 5           | 92 days  | Day 59          |

This exponential growth is the core of spaced repetition: longer intervals for stronger memories.

---

## Further Reading

- [SuperMemo 2 Algorithm (Original)](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Spaced Repetition Research Overview](https://www.gwern.net/Spaced-repetition)
- [Effective Learning Strategies](https://www.retrievalpractice.org/)

---

**Happy studying! 🎓**
