export interface SectionProps {
  config: Record<string, unknown>;
  setField: (path: string[], value: unknown) => void;
  getField: (path: string[]) => unknown;
  deleteField?: (path: string[]) => void;
  appendToArray?: (path: string[], value: unknown) => void;
  removeFromArray?: (path: string[], index: number) => void;
}
