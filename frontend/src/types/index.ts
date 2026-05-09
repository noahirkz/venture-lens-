// Shared frontend types — expand as features are built
export type ApiResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: string;
};
