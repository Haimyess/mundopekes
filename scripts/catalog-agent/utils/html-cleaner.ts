const STRIP_TAGS = /<(script|style|nav|header|footer|iframe)[^>]*>[\s\S]*?<\/\1>/gi

// Strips HTML down to plain text: drops noisy blocks, then all remaining tags,
// collapses whitespace, and caps the result to the first 4000 characters.
export function cleanHtml(html: string): string {
  const withoutBlocks = html.replace(STRIP_TAGS, ' ')
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, ' ')
  const collapsed = withoutTags.replace(/\s+/g, ' ').trim()
  return collapsed.slice(0, 4000)
}
