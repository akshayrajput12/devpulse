/**
 * Client-side stub for `@tanstack/react-start` to run fullstack codebases 
 * in a pure client SPA without compile-time or runtime framework errors.
 */

export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function createServerFn() {
  return {
    handler: (h: any) => h,
    inputValidator: () => {
      return {
        handler: (h: any) => h,
      };
    },
  };
}

export const createMiddleware = () => ({
  client: (h: any) => h,
  server: (h: any) => h,
});

export const createCsrfMiddleware = () => ({});
export const createStart = () => ({});
