import type { BlockEdits } from './context'

/**
 * A block's id is its page, kind and Uzbek title (context blockId). A title shown in Russian / English used to be read
 * back to Uzbek through the dictionary, and a translation shared by several Uzbek titles ("Total leads" ← Umumiy lid,
 * Jami lidlar, …) gave the same card another id in another language — another chat, other colours (owner, 2026-11-05:
 * "when I change the language it starts a new session — it should be one"). Cards now say their Uzbek title
 * (EditableBlock `idTitle`); what was kept under the id read back the old way is still found: `old` is that id.
 *
 * The edits as the blocks read them: a block with nothing under its own id takes what was kept under its old id, unless
 * that old id is another block on the page (`mounted`).
 */
export function withAliases(edits: BlockEdits, aliases: ReadonlyMap<string, string>, mounted: ReadonlySet<string>): BlockEdits {
  let out = edits
  for (const [id, old] of aliases) {
    if (old === id || id in edits || !(old in edits) || mounted.has(old)) continue
    if (out === edits) out = { ...edits }
    out[id] = edits[old]!
  }
  return out
}

/** a change about to be stored: an old id whose block now keeps its own entry goes (the settings moved to the new id) */
export function dropAliased(edits: BlockEdits, aliases: ReadonlyMap<string, string>, mounted: ReadonlySet<string>): BlockEdits {
  let out = edits
  for (const [id, old] of aliases) {
    if (old === id || !(id in edits) || !(old in out) || mounted.has(old)) continue
    if (out === edits) out = { ...edits }
    delete out[old]
  }
  return out
}
