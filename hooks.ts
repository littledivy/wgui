// deno-lint-ignore-file no-explicit-any
const hooks: any = [];
let currentHook = 0;

/**
 * Set the current hook index
 *
 * @example
 * ```tsx
 * setCurrentHook(0);
 * ```
 */
export const setCurrentHook = (hook: number): number => currentHook = hook;

/**
 * useState hook for managing state in functional components
 *
 * @example
 *
 * ```tsx
 * const [count, setCount] = useState(0);
 *
 * return (
 *  <div>
 *   <p>{count}</p>
 *  <button onClick={() => setCount(count + 1)}>Increment</button>
 * </div>
 * )
 * ```
 */
export function useState<T>(initialValue: T): [T, (T: T) => void] {
  const hook = hooks[currentHook] ?? initialValue;
  const i = currentHook;
  const setState = (value: any) => {
    hooks[i] = value;
  };
  currentHook++;
  return [hook, setState];
}

/**
 * useEffect hook for running side effects in functional components
 *
 * @example
 *
 * ```tsx
 * useEffect(() => {
 *  console.log('Component mounted');
 * }, []);
 * ```
 */
export function useEffect(callback: () => void, deps: any[]) {
  const hook = hooks[currentHook] ?? [];
  const i = currentHook;
  const [oldDeps] = hook;
  const hasChanged = deps.some((dep, i) => dep !== oldDeps[i]);
  if (hasChanged) {
    callback();
  }
  hooks[i] = [deps];
  currentHook++;
}
