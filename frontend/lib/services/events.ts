const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
export function subscribe(listener: () => void) {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("veriforge-updates");
    channel.onmessage = () => listeners.forEach((fn) => fn());
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function notify() {
  listeners.forEach((fn) => fn());
  channel?.postMessage("changed");
}
