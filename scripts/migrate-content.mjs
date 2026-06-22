import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const valaxyRoot = path.resolve(root, '..')
const contentDir = path.join(root, 'content')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8')
}

function writeFile(p, content) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, content, 'utf8')
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { fm: {}, body: raw }
  const fmText = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\n/, '')
  const fm = {}
  let listKey = null
  for (const line of fmText.split('\n')) {
    if (/^\s+-\s/.test(line) && listKey) {
      fm[listKey].push(line.replace(/^\s+-\s/, '').trim())
      continue
    }
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    if (val === '') {
      listKey = key
      fm[key] = []
      continue
    }
    listKey = null
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    } else {
      fm[key] = val.replace(/^['"]|['"]$/g, '')
    }
  }
  return { fm, body }
}

function slugFromFilename(name) {
  return name.replace(/\.md$/, '').toLowerCase()
}

function migratePosts() {
  const srcDir = path.join(valaxyRoot, 'pages', 'posts')
  const destDir = path.join(contentDir, 'posts')
  ensureDir(destDir)
  for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.md'))) {
    const raw = readFile(path.join(srcDir, file))
    const { fm, body } = parseFrontmatter(raw)
    const slug = slugFromFilename(file)
    const lines = ['---']
    lines.push(`title: "${(fm.title || slug).replace(/"/g, '\\"')}"`)
    if (fm.excerpt) lines.push(`description: "${String(fm.excerpt).replace(/"/g, '\\"')}"`)
    if (fm.date) lines.push(`date: ${String(fm.date).replace(/(\d{4}-\d{2}-)(\d)(?=\s)/, '$10$2')}`)
    if (fm.updated) lines.push(`lastmod: ${fm.updated}`)
    if (fm.cover) lines.push(`cover: "${fm.cover}"`)
    if (fm.top) lines.push(`weight: ${fm.top}`)
    if (fm.categories) {
      const cats = Array.isArray(fm.categories) ? fm.categories : [fm.categories]
      lines.push('categories:')
      cats.forEach(c => lines.push(`  - ${c}`))
    }
    if (fm.tags) {
      const tags = Array.isArray(fm.tags) ? fm.tags : [fm.tags]
      lines.push('tags:')
      tags.forEach(t => lines.push(`  - ${t}`))
    }
    lines.push('---', '')
    let newBody = body.replace(/\]\((valaxy-\d+|old-[^)\s]+|hello-world|Memos-web)\)/g, '](/posts/$1/)')
    writeFile(path.join(destDir, `${slug}.md`), lines.join('\n') + newBody)
  }
}

function writePage(dest, fmLines, body = '') {
  writeFile(dest, `---\n${fmLines.join('\n')}\n---\n\n${body}`)
}

function migrateGallery() {
  const galleryIndex = readFile(path.join(valaxyRoot, 'pages', 'gallery', 'index.md'))
  const { fm } = parseFrontmatter(galleryIndex)
  writePage(
    path.join(contentDir, 'gallery', '_index.md'),
    [`title: "相册"`, `cover: "${fm.cover}"`, `layout: "gallery"`],
  )

  const albums = ['bizhi', 'jiamio', 'web-jiami', 'web-kaif']
  for (const slug of albums) {
    const src = path.join(valaxyRoot, 'pages', 'gallery', slug, 'index.md')
    if (!fs.existsSync(src)) continue
    const { fm } = parseFrontmatter(readFile(src))
    const lines = [
      `title: "${fm.title}"`,
      `date: ${fm.date}`,
      `cover: "${fm.cover}"`,
      `desc: "${fm.desc || ''}"`,
      `location: "${fm.location || '重庆'}"`,
      `encrypted: ${fm.encrypted === 'true' || fm.encrypted === true}`,
    ]
    if (fm.password) lines.push(`password: "${fm.password}"`)
    lines.push('source: local')
    if (fm.tags) {
      lines.push('tags:')
      ;(Array.isArray(fm.tags) ? fm.tags : [fm.tags]).forEach(t => lines.push(`  - ${t}`))
    }
    if (fm.photos?.length) {
      lines.push('photos:')
      for (const p of fm.photos) {
        if (typeof p === 'string') lines.push(`  - url: "${p}"`)
        else lines.push(`  - url: "${p.url}"${p.date ? `\n    date: ${p.date}` : ''}`)
      }
    } else if (fm.cover) {
      lines.push('photos:')
      lines.push(`  - url: "${fm.cover}"`)
      lines.push(`    date: ${fm.date}`)
    }
    writePage(path.join(contentDir, 'gallery', slug, 'index.md'), lines)
  }
}

function createSpecialPages() {
  const about = parseFrontmatter(readFile(path.join(valaxyRoot, 'pages', 'about', 'index.md')))
  writePage(
    path.join(contentDir, 'about.md'),
    [
      `title: "${about.fm.title}"`,
      `layout: "about"`,
      `cover: "${about.fm.cover}"`,
      `date: ${about.fm.date}`,
    ],
    about.body,
  )

  const comment = parseFrontmatter(readFile(path.join(valaxyRoot, 'pages', 'comment', 'index.md')))
  writePage(path.join(contentDir, 'comment.md'), [
    `title: "${comment.fm.title}"`,
    `layout: "comment"`,
    `cover: "${comment.fm.cover}"`,
  ])

  writePage(path.join(contentDir, 'search.md'), [
    `title: "搜索"`,
    `layout: "search"`,
    `cover: "https://r2tc.20030327.xyz/file/博客/主题/1780646594844_wallhaven-5geqr5.jpg"`,
  ])

  writePage(path.join(contentDir, 'links.md'), [
    `title: "来加入我们叭"`,
    `layout: "links"`,
    `cover: "https://r2tc.20030327.xyz/file/博客/主题/1780909261513_1780909183175.png"`,
  ])

  const categories = parseFrontmatter(readFile(path.join(valaxyRoot, 'pages', 'categories', 'index.md')))
  writePage(path.join(contentDir, 'categories', '_index.md'), [
    `title: "${categories.fm.title}"`,
    `cover: "${categories.fm.cover}"`,
  ])

  const tags = parseFrontmatter(readFile(path.join(valaxyRoot, 'pages', 'tags', 'index.md')))
  writePage(path.join(contentDir, 'tags', '_index.md'), [
    `title: "${tags.fm.title}"`,
    `cover: "${tags.fm.cover}"`,
  ])

  const archives = parseFrontmatter(readFile(path.join(valaxyRoot, 'pages', 'archives', 'index.md')))
  writePage(path.join(contentDir, 'archives', '_index.md'), [
    `title: "${archives.fm.title}"`,
    `cover: "${archives.fm.cover}"`,
    `layout: "archives"`,
  ])
}

ensureDir(contentDir)
migratePosts()
migrateGallery()
createSpecialPages()
console.log('Content migration completed.')
