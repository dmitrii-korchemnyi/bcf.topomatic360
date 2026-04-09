type Listener = () => void;

class TreeBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}

export const treeBus = new TreeBus();
