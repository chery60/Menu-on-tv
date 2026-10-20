/** "a", "a and b", "a, b and c": a list in plain words. */
export function joinWords(words: readonly string[]): string {
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}
