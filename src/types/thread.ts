export type ThreadColor = {
  wholesaleCode: string;
  retailCode: string | null;
  name: string | null;
  hex: string;
  source: "shade-card";
};

export type ThreadMatch = ThreadColor & {
  deltaE: number;
};
