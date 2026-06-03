import type { ThreadColor } from "@/types/thread";

export function filterThreads(threads: ThreadColor[], query: string): ThreadColor[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return threads;
  }

  return threads.filter((thread) => {
    return [thread.name, thread.retailCode, thread.wholesaleCode]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized));
  });
}
