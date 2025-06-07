/**
 * Universe domain interfaces and types
 */
import { BaseEntity } from '../../shared/index.js';

export interface Location extends BaseEntity {
  name: string;
  description: string;
  coordinates?: Record<string, number>;
}

export interface Timeline extends BaseEntity {
  name: string;
  events: Array<{
    id: string;
    date: string;
    description: string;
  }>;
}

export interface Universe extends BaseEntity {
  name: string;
  description: string;
  locations: Location[];
  timelines: Timeline[];
}
