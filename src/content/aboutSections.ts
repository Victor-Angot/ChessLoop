/**
 * About page copy — append new sections here; AboutPage renders this list only.
 * No app logic should depend on specific section ids or titles.
 */

export interface AboutSection {
  /** Stable id for anchors / tests */
  id: string
  title: string
  /** Plain paragraphs (one string per paragraph) */
  body: string[]
}

export const aboutSections: AboutSection[] = [
  {
    id: 'what-is-srs',
    title: 'What is spaced repetition?',
    body: [
      'Spaced repetition is a learning technique that schedules reviews closer together when you are still learning something, and farther apart once you remember it reliably. Instead of cramming, you revisit material at the moment you are about to forget it — which strengthens long-term memory efficiently.',
      'Chess Loop uses this idea for your opening lines: each line has a “next review” time. Lines you know well come back less often; lines you struggle with return sooner.',
    ],
  },
  {
    id: 'how-we-score',
    title: 'How your reviews affect scheduling',
    body: [
      'After each line, we assign a quality score from 0 to 5 (similar in spirit to classic algorithms like SM-2). A strong, confident recall pushes the next review further out; mistakes or skips bring it back quickly.',
      'Hints and slips during an otherwise successful run are treated as a softer success — you still progress, but the interval grows a bit more slowly than a perfect recall.',
      '“Hard fail” ends the line on your first wrong move and updates scheduling immediately. “Continue” lets you see the right move and finish the line; scheduling still reflects whether you needed help along the way.',
    ],
  },
  {
    id: 'new-lines',
    title: 'New lines and “due” lines',
    body: [
      'Imported lines start as unseen: they are not mixed into ordered “due” sessions until you open them once. That first session marks them as seen and makes them part of your normal review queue.',
      'Random practice can still surface unseen lines when nothing is due, so you can explore new material anytime.',
    ],
  },
  {
    id: 'disclaimer',
    title: 'Not medical or coaching advice',
    body: [
      'The scheduler is a practical study tool, not a clinical spaced-repetition system. Adjust your study habits to what works for you, and treat ratings and intervals as guides — not guarantees.',
    ],
  },
]
