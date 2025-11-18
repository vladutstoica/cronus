/**
 * AI Request Queue - Prevents overwhelming the AI provider with too many concurrent requests
 *
 * Features:
 * - Limits concurrent AI requests to prevent queue buildup
 * - Deduplicates requests based on event ID
 * - Processes requests sequentially with delays
 */

interface QueuedRequest {
  eventId: string;
  processor: () => Promise<void>;
}

class AIRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = 0;
  private readonly maxConcurrent: number;
  private readonly delayBetweenRequests: number;

  constructor(maxConcurrent = 2, delayMs = 500) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayMs;
  }

  /**
   * Add a request to the queue
   * Duplicates (same eventId) are automatically skipped
   */
  add(eventId: string, processor: () => Promise<void>): void {
    // Skip if already in queue
    if (this.queue.find((item) => item.eventId === eventId)) {
      console.log(`🔁 SKIPPED: Event ${eventId} already in queue`);
      return;
    }

    this.queue.push({ eventId, processor });
    console.log(
      `📥 QUEUED: Event ${eventId} (queue size: ${this.queue.length}, processing: ${this.processing})`,
    );

    this.processNext();
  }

  /**
   * Process the next item in the queue
   */
  private async processNext(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const item = this.queue.shift();

    if (!item) {
      this.processing--;
      return;
    }

    try {
      await item.processor();

      // Add delay between requests to avoid overwhelming the AI provider
      if (this.delayBetweenRequests > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayBetweenRequests),
        );
      }
    } catch (error) {
      console.error(`❌ Error processing queue item ${item.eventId}:`, error);
    } finally {
      this.processing--;
      this.processNext(); // Process next item
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): { queueSize: number; processing: number } {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
    };
  }

  /**
   * Clear the entire queue (useful for testing or emergency stops)
   */
  clear(): void {
    this.queue = [];
    console.log("🧹 Queue cleared");
  }
}

// Global singleton instance
export const aiRequestQueue = new AIRequestQueue(2, 500); // Max 2 concurrent, 500ms delay
