import type { Response } from 'express';

interface Subscriber {
  id: string;
  res: Response;
}

export interface StreamMessage<T> {
  event: string;
  data: T;
}

class SseHub {
  private readonly subscribers = new Map<string, Map<string, Subscriber>>();

  subscribe(topic: string, subscriberId: string, res: Response): void {
    const topicSubscribers = this.subscribers.get(topic) ?? new Map<string, Subscriber>();
    topicSubscribers.set(subscriberId, { id: subscriberId, res });
    this.subscribers.set(topic, topicSubscribers);
  }

  unsubscribe(topic: string, subscriberId: string): void {
    const topicSubscribers = this.subscribers.get(topic);
    if (!topicSubscribers) {
      return;
    }

    topicSubscribers.delete(subscriberId);

    if (topicSubscribers.size === 0) {
      this.subscribers.delete(topic);
    }
  }

  publish<T>(topic: string, message: StreamMessage<T>): void {
    const topicSubscribers = this.subscribers.get(topic);
    if (!topicSubscribers) {
      return;
    }

    const serialized = `event: ${message.event}\ndata: ${JSON.stringify(message.data)}\n\n`;
    for (const subscriber of topicSubscribers.values()) {
      subscriber.res.write(serialized);
    }
  }
}

export const sseHub = new SseHub();
