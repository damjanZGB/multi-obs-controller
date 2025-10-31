import type { LogEntry } from '../../../shared/types';

export class LogBuffer {
  private readonly capacity: number;
  private readonly entries: LogEntry[] = [];

  constructor(capacity = 200) {
    this.capacity = capacity;
  }

  push(entry: LogEntry) {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.shift();
    }
  }

  list(): LogEntry[] {
    return [...this.entries];
  }
}
