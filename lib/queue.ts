/**
 * Queue management for batch processing prompts
 * Handles sequential input collection and consolidation
 */

export interface QueuedPrompt {
  id: string;
  text: string;
  order: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface PromptQueue {
  id: string;
  promptIds: string[];
  queue: QueuedPrompt[];
  status: 'collecting' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

// In-memory queue storage (in production, use a database)
const queueMap = new Map<string, PromptQueue>();

export function createQueue(promptId: string): PromptQueue {
  const queue: PromptQueue = {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    promptIds: [promptId],
    queue: [],
    status: 'collecting',
    createdAt: new Date(),
  };
  queueMap.set(queue.id, queue);
  return queue;
}

export function addToQueue(queueId: string, text: string): QueuedPrompt {
  const queue = queueMap.get(queueId);
  if (!queue) throw new Error(`Queue ${queueId} not found`);

  const queuedPrompt: QueuedPrompt = {
    id: `queued-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    order: queue.queue.length,
    status: 'pending',
  };

  queue.queue.push(queuedPrompt);
  return queuedPrompt;
}

export function getQueue(queueId: string): PromptQueue | undefined {
  return queueMap.get(queueId);
}

export function updateQueueStatus(queueId: string, queuedPromptId: string, status: QueuedPrompt['status'], error?: string): void {
  const queue = queueMap.get(queueId);
  if (!queue) throw new Error(`Queue ${queueId} not found`);

  const queuedPrompt = queue.queue.find((p) => p.id === queuedPromptId);
  if (!queuedPrompt) throw new Error(`Queued prompt ${queuedPromptId} not found`);

  queuedPrompt.status = status;
  if (error) queuedPrompt.error = error;
}

export function completeQueue(queueId: string): void {
  const queue = queueMap.get(queueId);
  if (!queue) throw new Error(`Queue ${queueId} not found`);
  queue.status = 'completed';
  queue.completedAt = new Date();
}

export function failQueue(queueId: string): void {
  const queue = queueMap.get(queueId);
  if (!queue) throw new Error(`Queue ${queueId} not found`);
  queue.status = 'failed';
  queue.completedAt = new Date();
}

export function startQueueProcessing(queueId: string): void {
  const queue = queueMap.get(queueId);
  if (!queue) throw new Error(`Queue ${queueId} not found`);
  queue.status = 'processing';
}

export function deleteQueue(queueId: string): void {
  queueMap.delete(queueId);
}
