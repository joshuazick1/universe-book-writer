/**
 * Universe domain interfaces and types
 */
import type { BaseEntity } from '../../shared/index.js';

export interface Location extends BaseEntity {
  name: string;
  description: string;
  coordinates?: Record<string, number>;
}

export interface TimelineEvent extends BaseEntity {
  date: string;
  description: string;
  participants?: string[];
  location?: string;
}

export interface Timeline extends BaseEntity {
  name: string;
  events: TimelineEvent[];
}

export interface Organization extends BaseEntity {
  name: string;
  type: string;
  description: string;
  foundedDate?: string;
  headquarters?: string;
  members?: string[];
}

export interface Universe extends BaseEntity {
  name: string;
  description: string;
  locations: Location[];
  timelines: Timeline[];
  organizations?: Organization[];
}
