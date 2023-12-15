const storage = {
  set: (key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value));
  },
  get: <T>(key: string, defaultValue?: T): T => {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
  },
  remove: (key: string) => {
      localStorage.removeItem(key);
  },
};

export default storage;