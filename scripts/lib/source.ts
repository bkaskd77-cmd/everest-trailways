/**
 * Reading source the way the runtime does, not the way grep does.
 *
 * Twice now a guard has passed on something that never runs. The
 * bookable-listing rule was satisfied by an import left behind after the
 * filter it named was deleted. The noindex rule was satisfied by the
 * declaration of the very helper whose call had been removed. Both were the
 * same mistake wearing different clothes: asking whether a NAME appears in a
 * file, when the question is whether the code DOES something.
 *
 * Four things can carry a name without executing it — an import, a
 * declaration, a comment, and a type. This module removes all four and then
 * looks for a call. Anything a guard checks by reading source should go
 * through here, and anything that cannot be settled this way should be checked
 * against rendered output instead, where the question is not "is it written"
 * but "did it happen".
 */

/**
 * Everything that could run, with everything that could not removed.
 *
 * Deliberately crude — this is not a parser and does not need to be. It has to
 * be conservative in one direction only: it must never leave a comment,
 * import, or type in the text, because those are what produce a false pass.
 * Removing slightly too much produces a false FAILURE, which somebody notices
 * immediately.
 */
export function executable(source: string): string {
  return (
    source
      /* Block comments, including the JSDoc that names every helper. */
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      /* Line comments. The negative lookbehind keeps `https://` intact. */
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
      /* JSX comments: {/* ... *\/} survives the block rule as braces. */
      .replace(/\{\s*\}/g, " ")
      /* Imports, side-effect imports included. */
      .replace(/^[ \t]*import\s[\s\S]*?from\s*["'][^"']+["'];?[ \t]*$/gm, " ")
      .replace(/^[ \t]*import\s*["'][^"']+["'];?[ \t]*$/gm, " ")
      /* Re-exports carry names without using them. */
      .replace(
        /^[ \t]*export\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?[ \t]*$/gm,
        " ",
      )
      /* Type and interface declarations. */
      .replace(/^[ \t]*(export\s+)?type\s+\w+[\s\S]*?;[ \t]*$/gm, " ")
      .replace(
        /^[ \t]*(export\s+)?interface\s+\w+\s*\{[\s\S]*?\n\}[ \t]*$/gm,
        " ",
      )
  );
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Is this function actually called somewhere that runs?
 *
 * A declaration is not a call. `function checkLimit(` and `const originAllowed
 * = (` both contain the name followed by a parenthesis eventually, and both
 * mean the opposite of what the guard is asking.
 */
export function callsFunction(source: string, name: string): boolean {
  const body = executable(source);
  /*
   * The boundary has to admit a spread and exclude a member access.
   *
   * A blanket "not preceded by a dot" looked right and rejected
   * `[...bookableDepartures()]` — the spread's dots read as property access,
   * so the rule failed on a file that was calling the function on the very
   * line it was reading. What separates them is what precedes the dot:
   * `obj.method(` has an identifier there, `...spread(` has another dot.
   */
  const pattern = new RegExp(
    `(?<![\\w$])(?<![\\w$)\\]]\\.)${escapeRe(name)}\\s*\\(`,
    "g",
  );

  for (const match of body.matchAll(pattern)) {
    const before = body.slice(Math.max(0, match.index - 40), match.index);
    /* `function name(` and `class name(` are declarations, not calls. */
    if (/\b(function|class)\s+$/.test(before)) continue;
    if (/\b(export\s+)?(async\s+)?function\s+$/.test(before)) continue;
    return true;
  }
  return false;
}

/**
 * Is this identifier referenced by code that runs?
 *
 * For constants rather than functions — `MAX_BODY_BYTES` is used, not called.
 * An import of it is not a use, which is the whole point.
 */
export function usesIdentifier(source: string, name: string): boolean {
  const body = executable(source);
  /* Same boundary as `callsFunction` — see the note there. */
  const pattern = new RegExp(
    `(?<![\\w$])(?<![\\w$)\\]]\\.)${escapeRe(name)}\\b`,
    "g",
  );

  for (const match of body.matchAll(pattern)) {
    const before = body.slice(Math.max(0, match.index - 40), match.index);
    /* Its own declaration does not count as using it. */
    if (/\b(const|let|var|function|class)\s+$/.test(before)) continue;
    return true;
  }
  return false;
}

/**
 * Is this component actually rendered?
 *
 * An import of `<GlanceBar>` proves nothing; `<GlanceBar` in the tree does.
 * Checked against executable text so a component named only inside a comment —
 * which is how these things get discussed in the code that removed them — does
 * not count either.
 */
export function rendersComponent(source: string, name: string): boolean {
  const body = executable(source);
  return new RegExp(`<${escapeRe(name)}[\\s/>]`).test(body);
}
