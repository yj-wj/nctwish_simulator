/** UI-only structures. Domain types live in the other files under /types. */
export interface StoryChoice { id: "A" | "B" | "C"; text: string }
export interface MockStory {
  title: string;
  time: string;
  sourceLabel: string;
  subtitle: string;
  paragraphs: string[];
  choices: StoryChoice[];
}
export interface ActionReceipt { label: string; response: string }
