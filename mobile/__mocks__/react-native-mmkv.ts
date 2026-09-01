type MockMMKV = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => boolean;
};

export function createMMKV(): MockMMKV {
  const store = new Map<string, string>();

  return {
    getString: (key: string) => store.get(key),
    set: (key: string, value: string) => {
      store.set(key, value);
    },
    remove: (key: string) => store.delete(key),
  };
}
