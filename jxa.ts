export const runJXACode = <R>(jxaCode: string): Promise<R> => {
  return runInOsascript(jxaCode, []);
};

export function run<R>(
  jxaFunction: () => R,
): Promise<R>;

export function run<R>(
  jxaFunction: (...args: any[]) => R,
  ...args: any[]
): Promise<R>;

export function run<R, A1>(
  jxaFunction: (a1: A1) => R,
  a1: A1,
): Promise<R>;

export function run<R, A1, A2>(
  jxaFunction: (a1: A1, a2: A2) => R,
  a1: A1,
  a2: A2,
): Promise<R>;

export function run<R, A1, A2, A3>(
  jxaFunction: (a1: A1, a2: A2, a3: A3) => R,
  a1: A1,
  a2: A2,
  a3: A3,
): Promise<R>;

export function run<R, A1, A2, A3, A4>(
  jxaFunction: (a1: A1, a2: A2, a3: A3, a4: A4) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
): Promise<R>;

export function run<R, A1, A2, A3, A4, A5>(
  jxaFunction: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
  a5: A5,
): Promise<R>;

export function run<R, A1, A2, A3, A4, A5, A6>(
  jxaFunction: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
  a5: A5,
  a6: A6,
): Promise<R>;

export function run<R, A1, A2, A3, A4, A5, A6, A7>(
  jxaFunction: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6,
    a7: A7,
  ) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
  a5: A5,
  a6: A6,
  a7: A7,
): Promise<R>;

export function run<R, A1, A2, A3, A4, A5, A6, A7, A8>(
  jxaFunction: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6,
    a7: A7,
    a8: A8,
  ) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
  a5: A5,
  a6: A6,
  a7: A7,
  a8: A8,
): Promise<R>;

export function run<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  jxaFunction: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    a6: A6,
    a7: A7,
    a8: A8,
    a9: A9,
  ) => R,
  a1: A1,
  a2: A2,
  a3: A3,
  a4: A4,
  a5: A5,
  a6: A6,
  a7: A7,
  a8: A8,
  a9: A9,
): Promise<R>;

export function run(jxaFunction: (...args: any[]) => any, ...args: any[]) {
  const code = `
  ObjC.import('stdlib');
  const args = JSON.parse($.getenv('OSA_ARGS'));
  const fn   = (${jxaFunction.toString()});
  const out  = fn.apply(null, args);
  JSON.stringify({ result: out });
  `;
  return runInOsascript(code, args);
}

const runInOsascript = async (code: string, args: any[]) => {
  const cmd = new Deno.Command("osascript", {
    args: ["-l", "JavaScript"],
    env: { OSA_ARGS: JSON.stringify(args) },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const child = cmd.spawn();
  const { stdin } = child;

  const stdinWriter = stdin.getWriter();

  await stdinWriter.ready;
  await stdinWriter.write(encoder.encode(code));
  stdinWriter.releaseLock();
  // stdinWriter.close();
  stdin.close();

  const _output = await child.output();
  const error = _output.stderr;
  const output = _output.stdout;
  // child.kill();

  if (error.length) handleError(decoder.decode(error));
  const outStr = decoder.decode(output);
  if (!output.length) return undefined;
  try {
    const result = JSON.parse(outStr.trim()).result;
    return result;
  } catch {
    return outStr.trim();
  }
};

const handleError = (OsascriptMessage: string) => {
  const errorGroups = OsascriptMessage.match(
    /execution\serror:\sError:\s(?<type>\w+):\s(?<message>.+)\(-\d+\)/,
  )?.groups;
  const errorTypeString = errorGroups?.type ?? "";
  const errorMessage = errorGroups?.message?.trim() ??
    "An error occured";
  const errorMapping: Record<string, ErrorConstructor> = {
    Error: Error,
    EvalError: EvalError,
    RangeError: RangeError,
    ReferenceError: ReferenceError,
    SyntaxError: SyntaxError,
    TypeError: TypeError,
    URIError: URIError,
  };
  const errorType = errorMapping?.[errorTypeString] ?? Error;
  throw errorType(errorMessage);
};