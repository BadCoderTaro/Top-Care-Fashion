export type SellFormResetPayload = {
  reason?: "posted" | "cancelled" | "draftCleared";
};

type Listener = (payload?: SellFormResetPayload) => void;

const listeners = new Set<Listener>();

export function onSellFormReset(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSellFormReset(payload?: SellFormResetPayload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn("Sell form reset listener threw", error);
    }
  });
}

