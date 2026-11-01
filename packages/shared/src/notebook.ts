/** Map a native textarea selection (LF-normalized) back to canonical UTF-16 offsets. */
export function notebookSourceRange(
  source: string,
  start: number,
  end: number
) {
  const offsets = [0]
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "\r" && source[index + 1] === "\n") index++
    offsets.push(index + 1)
  }
  return { start: offsets[start] ?? 0, end: offsets[end] ?? 0 }
}
