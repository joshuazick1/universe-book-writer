/**
 * Story domain interfaces and types
 */
import { BaseEntity } from '../../shared/index.js';

export interface Character extends BaseEntity {
  name: string;
  description: string;
  attributes: Record<string, unknown>;
}

export interface StoryChapter extends BaseEntity {
  title: string;
  content: string;
  characters: Character[];
}

export interface Story extends BaseEntity {
  title: string;
  summary: string;
  chapters: StoryChapter[];
  characters: Character[];
}
