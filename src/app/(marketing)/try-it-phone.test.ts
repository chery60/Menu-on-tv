/**
 * QA check for docs/prd/mt-98-try-it-on-phones.md, Design: "Under 1000px ... (`.mtv-try`): the TV moves
 * above the fields and becomes `position: sticky`". The rest of the PRD needs a browser:
 * src/verify/check-try-it-phone.mjs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface Rule {
  readonly selector: string;
  readonly media: readonly string[];
  readonly declarations: string;
}

const css = readFileSync(fileURLToPath(new URL('./home.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Style rules with the @media conditions around them. */
function rulesOf(text: string, media: readonly string[] = []): Rule[] {
  const rules: Rule[] = [];
  let at = 0;
  for (let open = text.indexOf('{', at); open >= 0; open = text.indexOf('{', at)) {
    const prelude = text.slice(at, open).split(/[;}]/).pop()!.trim();
    let depth = 1;
    let end = open + 1;
    for (; depth > 0 && end < text.length; end++) depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0;
    const body = text.slice(open + 1, end - 1);
    if (prelude.startsWith('@media')) rules.push(...rulesOf(body, [...media, prelude]));
    else if (prelude.startsWith('@')) rules.push(...rulesOf(body, media));
    else rules.push({ selector: prelude, media, declarations: body });
    at = end;
  }
  return rules;
}

/** True when a media condition only matches windows narrower than 1000px. */
function onlyUnder1000(condition: string): boolean {
  const max = condition.match(/max-width:\s*(\d+(?:\.\d+)?)px/);
  const below = condition.match(/width\s*<\s*(\d+(?:\.\d+)?)px/);
  return (!!max && Number(max[1]) < 1000) || (!!below && Number(below[1]) <= 1000);
}

const pinned = (rule: Rule) => /\.mtv-try\b|\.mtv-try-/.test(rule.selector) && /position:\s*sticky/.test(rule.declarations);

describe('MT-98: the Try it TV on phones', () => {
  it('reads the rules in home.css', () => {
    expect(rulesOf(css).length).toBeGreaterThan(50);
  });

  it('under 1000px, a Try it rule pins the TV with position: sticky', () => {
    const phoneRules = rulesOf(css).filter((rule) => pinned(rule) && rule.media.some(onlyUnder1000));
    expect(phoneRules.map((rule) => rule.selector)).not.toEqual([]);
  });
});
