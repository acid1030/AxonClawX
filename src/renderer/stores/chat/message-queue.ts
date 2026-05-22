interface MessageQueueSchedulerOptions {
  drain: () => Promise<void>;
  delayMs?: number;
}

export function createMessageQueueScheduler(options: MessageQueueSchedulerOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const delayMs = options.delayMs ?? 250;

  return {
    schedule(): void {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void options.drain();
      }, delayMs);
    },

    clear(): void {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    },
  };
}
