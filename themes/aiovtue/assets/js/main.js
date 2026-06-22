import { createLightboxZoom } from './lightbox-zoom.js'

function applyTheme(root, isDark) {
  root.classList.toggle('dark', isDark)
  localStorage.setItem('sakura-theme', isDark ? 'dark' : 'light')
}

function getThemeToggleOrigin(event) {
  const button = document.getElementById('theme-toggle')
  const rect = button?.getBoundingClientRect()
  const x = event?.clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2)
  const y = event?.clientY ?? (rect ? rect.top + rect.height / 2 : window.innerHeight / 2)
  return { x, y }
}

function toggleTheme(event) {
  const root = document.documentElement
  const nextDark = !root.classList.contains('dark')
  const apply = () => applyTheme(root, nextDark)

  if (
    !document.startViewTransition
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    apply()
    return
  }

  const { x, y } = getThemeToggleOrigin(event)
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const transitionClass = nextDark ? 'theme-transition-to-dark' : 'theme-transition-to-light'

  root.classList.remove('theme-transition-to-dark', 'theme-transition-to-light')
  root.classList.add(transitionClass)

  const transition = document.startViewTransition(apply)

  transition.ready.then(() => {
    const toDark = nextDark
    document.documentElement.animate(
      {
        clipPath: toDark
          ? [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ]
          : [
            `circle(${endRadius}px at ${x}px ${y}px)`,
            `circle(0px at ${x}px ${y}px)`,
          ],
      },
      {
        duration: 320,
        easing: 'ease-in-out',
        pseudoElement: toDark ? '::view-transition-new(root)' : '::view-transition-old(root)',
      },
    )
  }).catch(() => {})

  transition.finished.finally(() => {
    root.classList.remove('theme-transition-to-dark', 'theme-transition-to-light')
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement
  const stored = localStorage.getItem('sakura-theme')
  if (stored === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  document.getElementById('theme-toggle')?.addEventListener('click', (event) => {
    toggleTheme(event)
  })

  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  const toggleSidebar = (open) => {
    sidebar?.classList.toggle('is-open', open)
    overlay?.classList.toggle('is-open', open)
    sidebar?.setAttribute('aria-hidden', open ? 'false' : 'true')
    const menuBtn = document.getElementById('sidebar-toggle')
    menuBtn?.classList.toggle('mobile-btn-open', open)
    menuBtn?.setAttribute('aria-expanded', open ? 'true' : 'false')
  }
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    toggleSidebar(!sidebar?.classList.contains('is-open'))
  })
  overlay?.addEventListener('click', () => toggleSidebar(false))
  initSidebar(toggleSidebar)

  initHomeNavbar()
  initNavbarLinkScroll()
  initNavbarDropdown()
  initBrandRotate()
  initHeroMedia()
  initHeroHitokoto()
  initLazyImages()
  initMarkdownCodeBlocks()
  initPostSponsor()
  document.getElementById('hero-scroll-down')?.addEventListener('click', scrollPastHero)

  initNoticeBoard()
  initSiteRuntime()
  initHomePaginationScroll()
  initPostToc()

  const modal = document.getElementById('search-modal')
  const searchBtn = document.getElementById('search-open')
  let searchScrollLock = ''
  const isSearchOpen = () => modal && !modal.hidden
  const setSearchOpen = (open) => {
    if (!modal) return
    modal.hidden = !open
    if (open) {
      searchScrollLock = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      setTimeout(() => document.getElementById('search-modal-input')?.focus(), 0)
    } else {
      document.body.style.overflow = searchScrollLock
    }
    document.documentElement.classList.toggle('is-search-open', open)
    searchBtn?.classList.toggle('is-search-open', open)
    searchBtn?.setAttribute('aria-expanded', open ? 'true' : 'false')
    searchBtn?.setAttribute('aria-label', open ? '关闭搜索' : '搜索')
  }
  const openSearch = () => setSearchOpen(true)
  const closeSearch = () => setSearchOpen(false)
  searchBtn?.addEventListener('click', () => {
    if (isSearchOpen()) closeSearch()
    else openSearch()
  })
  document.getElementById('search-modal-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim()
      closeSearch()
      window.location.href = `/search/?q=${encodeURIComponent(q)}`
    }
    if (e.key === 'Escape') closeSearch()
  })
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeSearch() })

  document.getElementById('copy-yml-btn')?.addEventListener('click', async () => {
    const el = document.getElementById('yml-template')
    const text = el?.value || el?.textContent || ''
    try { await navigator.clipboard.writeText(text) } catch (_) {}
  })

  initComments()
  initEnvelope()
  initAlbumPasswordGate()

  initPostImageRows()
  initLightbox()
  initCharts()
  initSearchPage()
})

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function initEnvelope() {
  const envelope = document.getElementById('envelope-wrap')
  if (!envelope) return

  const scrollCloseTop = 80
  let scrollRaf = 0

  const isOpened = () => envelope.classList.contains('opened')
  const open = () => envelope.classList.add('opened')
  const close = () => envelope.classList.remove('opened')

  const getScrollTop = () => window.pageYOffset
    || document.documentElement.scrollTop
    || document.body.scrollTop
    || 0

  const isEnvelopeFullyVisible = () => {
    if (isOpened()) return false
    const rect = envelope.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    return rect.top >= 0 && rect.bottom <= window.innerHeight + 1
  }

  const updateEnvelopeByScroll = () => {
    if (isEnvelopeFullyVisible()) {
      open()
      return
    }
    if (isOpened() && getScrollTop() <= scrollCloseTop) close()
  }

  const handleScroll = () => {
    if (scrollRaf) return
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0
      updateEnvelopeByScroll()
    })
  }

  envelope.addEventListener('click', () => {
    if (!isOpened()) open()
  })

  updateEnvelopeByScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll, { passive: true })
}

const TWIKOO_COMMENT_PLACEHOLDER = '分享你的想法...'
const TWIKOO_META_PLACEHOLDERS = {
  nick: '昵称',
  mail: '邮箱',
  link: '网址 (选填)',
}
const TWIKOO_DELETE_ICON_MARK = 'M48 224l0 160c0 8.8'

let twikooFormObserver = null

function hideTwikooDeleteButtons(root) {
  root.querySelectorAll('.tk-comment .tk-action > .tk-action-link').forEach((link) => {
    const icon = link.querySelector('.tk-action-icon')
    if (icon?.innerHTML.includes(TWIKOO_DELETE_ICON_MARK)) {
      link.style.setProperty('display', 'none', 'important')
    }
  })
}

function customizeTwikooCommentForm() {
  document.querySelectorAll('.sakura-comment .twikoo, #tcomment').forEach((root) => {
    root.querySelectorAll('.tk-submit .tk-meta-input .el-input__inner').forEach((input) => {
      input.placeholder = TWIKOO_META_PLACEHOLDERS[input.name] ?? ''
    })

    root.querySelectorAll('.tk-submit .tk-input .el-textarea__inner').forEach((textarea) => {
      textarea.placeholder = TWIKOO_COMMENT_PLACEHOLDER
    })

    hideTwikooDeleteButtons(root)
  })
}

function observeTwikooCommentForm() {
  if (twikooFormObserver) return

  const targets = document.querySelectorAll('.sakura-comment, .comment, #tcomment')
  if (!targets.length) return

  twikooFormObserver = new MutationObserver(() => customizeTwikooCommentForm())
  targets.forEach((target) => twikooFormObserver.observe(target, { childList: true, subtree: true }))
}

const WALINE_CLIENT_URL = 'https://unpkg.com/@waline/client@v3/dist/waline.js'

function initComments() {
  const section = document.querySelector('.sakura-comment')
  if (!section) return
  const provider = section.dataset.commentProvider || 'waline'
  if (provider === 'twikoo') initTwikoo()
  else initWaline()
}

async function initWaline() {
  const walineEl = document.getElementById('waline')
  if (!walineEl) return

  const serverURL = (
    document.querySelector('meta[name="sakura-waline-server"]')?.content
    || String(window.SAKURA_WALINE_SERVER || '')
  ).replace(/^["']|["']$/g, '').trim()
  const placeholder = walineEl.dataset.placeholder || '分享你的想法...'

  if (!serverURL) {
    walineEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Waline 评论尚未配置，请在 hugo.toml 的 <code>params.waline.serverURL</code> 中填写服务端地址。</p>'
    return
  }

  try {
    const { init } = await import(WALINE_CLIENT_URL)
    init({
      el: '#waline',
      serverURL,
      path: window.location.pathname,
      lang: 'zh-CN',
      placeholder,
      dark: 'html.dark',
      emoji: true,
    })
  } catch (error) {
    console.error('[waline]', error)
    walineEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">评论加载失败，请检查网络或 Waline 服务端是否可访问。</p>'
  }
}

function initTwikoo() {
  const twikooEl = document.getElementById('tcomment')
  if (!twikooEl) return

  const envId = (
    document.querySelector('meta[name="sakura-twikoo-env"]')?.content
    || String(window.SAKURA_TWIKOO_ENV || '')
  ).replace(/^["']|["']$/g, '').trim()
  if (!envId) {
    twikooEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Twikoo 评论尚未配置，请在 hugo.toml 的 <code>params.twikoo.envId</code> 中填写环境 ID。</p>'
    return
  }

  const run = () => {
    if (!window.twikoo?.init) return false
    window.twikoo.init({
      envId,
      el: '#tcomment',
      path: window.location.pathname,
      lang: 'zh-CN',
      placeholder: TWIKOO_COMMENT_PLACEHOLDER,
    }).catch((error) => {
      console.error('[twikoo]', error)
      twikooEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">评论加载失败，请稍后刷新重试。</p>'
    })
    window.requestAnimationFrame(() => {
      customizeTwikooCommentForm()
      observeTwikooCommentForm()
    })
    return true
  }

  if (run()) return

  let tries = 0
  const timer = window.setInterval(() => {
    tries += 1
    if (run() || tries >= 40) {
      window.clearInterval(timer)
      if (!window.twikoo?.init) {
        twikooEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">评论组件加载失败，请检查网络或 Twikoo CDN 是否可访问。</p>'
      }
    }
  }, 100)
}

function initAlbumPasswordGate() {
  const page = document.querySelector('.sakura-gallery-album-page.is-locked')
  if (!page) return

  const gate = document.getElementById('album-password-gate')
  const viewer = document.getElementById('album-viewer')
  const form = document.getElementById('album-password-form')
  const input = document.getElementById('album-password-input')
  const err = document.getElementById('album-password-error')
  const expected = (page.dataset.albumPassword || gate?.dataset.password || '').trim()

  if (!gate || !viewer || !form || !input || !expected) return

  const unlock = () => {
    page.classList.remove('is-locked')
    gate.classList.add('is-hidden')
    viewer.classList.remove('is-hidden')
    if (err) err.hidden = true
    appendAlbumViewerLightboxItems(viewer)
    input.blur()
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (input.value.trim() === expected) {
      unlock()
      return
    }
    if (err) err.hidden = false
    input.select()
  })
}

const lightboxState = {
  box: null,
  main: null,
  stage: null,
  thumbs: null,
  track: null,
  counter: null,
  items: [],
  index: 0,
  activeMedia: null,
  zoom: null,
  thumbWidth: 72,
  thumbStep: 82,
  show: null,
}

function collectAlbumViewerItems(root = document) {
  const items = []
  root.querySelectorAll('.album-viewer__photo[data-media-src]').forEach((el) => {
    if (el.dataset.lightboxBound === '1') return
    const src = el.dataset.mediaSrc
    if (!src) return
    const thumbImg = el.querySelector('img')
    items.push({
      el,
      src,
      type: el.dataset.mediaType === 'video' ? 'video' : 'image',
      poster: thumbImg?.src || '',
    })
  })
  return items
}

function updateLightboxThumbMetrics() {
  const container = lightboxState.thumbs
  const thumb = container?.querySelector('.lightbox__thumb')
  const track = lightboxState.track
  if (!container || !thumb || !track) return

  lightboxState.thumbWidth = thumb.offsetWidth
  const gapValue = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0')
  lightboxState.thumbStep = lightboxState.thumbWidth + (Number.isFinite(gapValue) ? gapValue : 0)
}

function updateLightboxThumbTrack() {
  updateLightboxThumbMetrics()
  const container = lightboxState.thumbs
  const track = lightboxState.track
  if (!container || !track) return

  const offset = container.clientWidth / 2 - lightboxState.thumbWidth / 2 - lightboxState.index * lightboxState.thumbStep
  track.style.transform = `translateX(${offset}px)`
}

function updateLightboxThumbUI() {
  lightboxState.track?.querySelectorAll('.lightbox__thumb').forEach((btn, i) => {
    if (i === lightboxState.index) btn.setAttribute('aria-current', 'true')
    else btn.removeAttribute('aria-current')
  })

  if (lightboxState.counter) {
    if (lightboxState.items.length > 1) {
      lightboxState.counter.hidden = false
      lightboxState.counter.textContent = `${lightboxState.index + 1} / ${lightboxState.items.length}`
    } else {
      lightboxState.counter.hidden = true
    }
  }

  const prev = lightboxState.box?.querySelector('.lightbox__prev')
  const next = lightboxState.box?.querySelector('.lightbox__next')
  if (prev) prev.hidden = lightboxState.index <= 0
  if (next) next.hidden = lightboxState.index >= lightboxState.items.length - 1

  updateLightboxThumbTrack()
}

function rebuildLightboxThumbs() {
  ensureLightbox()
  const track = lightboxState.track
  const thumbs = lightboxState.thumbs
  if (!track || !thumbs) return

  track.innerHTML = ''
  lightboxState.items.forEach((item, index) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'lightbox__thumb'
    btn.setAttribute('aria-label', `查看第 ${index + 1} 项`)

    const img = document.createElement('img')
    img.className = 'lightbox__thumb-media'
    img.src = item.type === 'video' ? (item.poster || item.src) : item.src
    img.alt = ''
    img.loading = 'lazy'
    img.decoding = 'async'
    btn.appendChild(img)

    if (item.type === 'video') {
      const play = document.createElement('span')
      play.className = 'lightbox__thumb-play'
      play.setAttribute('aria-hidden', 'true')
      play.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>'
      btn.appendChild(play)
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      lightboxState.show(index)
    })
    track.appendChild(btn)
  })

  thumbs.hidden = lightboxState.items.length <= 1
  updateLightboxThumbUI()
}

function ensureLightbox() {
  if (lightboxState.box) return

  const box = document.createElement('div')
  box.className = 'lightbox'
  box.hidden = true
  box.innerHTML = `
    <div class="lightbox__main">
      <button class="lightbox__close" type="button" aria-label="关闭">×</button>
      <button class="lightbox__prev" type="button" aria-label="上一张">‹</button>
      <button class="lightbox__next" type="button" aria-label="下一张">›</button>
      <div class="lightbox__stage-wrap">
        <div class="lightbox__stage"></div>
        <span class="lightbox__counter" hidden></span>
      </div>
    </div>
    <div class="lightbox__thumbs" hidden>
      <div class="lightbox__thumbs-indicator" aria-hidden="true"></div>
      <div class="lightbox__thumbs-track"></div>
    </div>
  `
  document.body.appendChild(box)

  lightboxState.box = box
  lightboxState.main = box.querySelector('.lightbox__main')
  lightboxState.stage = box.querySelector('.lightbox__stage')
  lightboxState.thumbs = box.querySelector('.lightbox__thumbs')
  lightboxState.track = box.querySelector('.lightbox__thumbs-track')
  lightboxState.counter = box.querySelector('.lightbox__counter')

  const clearStage = () => {
    if (lightboxState.activeMedia?.tagName === 'VIDEO') {
      lightboxState.activeMedia.pause()
    }
    lightboxState.zoom?.destroy()
    lightboxState.zoom = null
    if (lightboxState.stage) lightboxState.stage.innerHTML = ''
    lightboxState.activeMedia = null
  }

  const isLightboxZoomed = () => lightboxState.zoom?.isZoomed?.() ?? false

  const show = (i) => {
    if (!lightboxState.items.length) return
    lightboxState.index = (i + lightboxState.items.length) % lightboxState.items.length
    const item = lightboxState.items[lightboxState.index]
    clearStage()

    if (item.type === 'video') {
      const video = document.createElement('video')
      video.className = 'lightbox__media'
      video.src = item.src
      video.controls = true
      video.autoplay = true
      video.playsInline = true
      if (item.poster) video.poster = item.poster
      lightboxState.stage.appendChild(video)
      lightboxState.activeMedia = video
    } else {
      const viewport = document.createElement('div')
      viewport.className = 'lightbox__viewport'
      const img = document.createElement('img')
      img.className = 'lightbox__media lightbox__img'
      img.alt = ''
      img.src = item.src
      img.draggable = false
      viewport.appendChild(img)
      lightboxState.stage.appendChild(viewport)
      lightboxState.activeMedia = img
      lightboxState.zoom = createLightboxZoom(img, viewport)
    }

    box.hidden = false
    document.documentElement.classList.add('image-gallery-open')
    updateLightboxThumbUI()
    requestAnimationFrame(() => updateLightboxThumbTrack())
  }

  const hide = () => {
    clearStage()
    box.hidden = true
    document.documentElement.classList.remove('image-gallery-open')
  }

  box.querySelector('.lightbox__close')?.addEventListener('click', hide)
  box.querySelector('.lightbox__prev')?.addEventListener('click', (e) => {
    e.stopPropagation()
    show(lightboxState.index - 1)
  })
  box.querySelector('.lightbox__next')?.addEventListener('click', (e) => {
    e.stopPropagation()
    show(lightboxState.index + 1)
  })
  lightboxState.main?.addEventListener('click', (e) => {
    if (e.target === lightboxState.main) hide()
  })
  box.addEventListener('click', (e) => {
    if (e.target === box) hide()
  })

  window.addEventListener('keydown', (e) => {
    if (box.hidden) return
    if (e.key === 'Escape') hide()
    if (isLightboxZoomed()) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      show(lightboxState.index - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      show(lightboxState.index + 1)
    }
  })

  let swipeStartX = 0
  let swipeStartY = 0
  let swipeTracking = false

  lightboxState.stage?.addEventListener('touchstart', (e) => {
    if (isLightboxZoomed() || e.touches.length !== 1) return
    swipeStartX = e.touches[0].clientX
    swipeStartY = e.touches[0].clientY
    swipeTracking = true
  }, { passive: true })

  lightboxState.stage?.addEventListener('touchend', (e) => {
    if (!swipeTracking) return
    swipeTracking = false
    if (isLightboxZoomed()) return
    const touch = e.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - swipeStartX
    const deltaY = touch.clientY - swipeStartY
    if (Math.abs(deltaX) < 48 || Math.abs(deltaY) > Math.abs(deltaX)) return
    if (deltaX > 0) show(lightboxState.index - 1)
    else show(lightboxState.index + 1)
  }, { passive: true })

  lightboxState.stage?.addEventListener('touchcancel', () => {
    swipeTracking = false
  }, { passive: true })

  window.addEventListener('resize', () => {
    if (!box.hidden) updateLightboxThumbTrack()
  })

  lightboxState.show = show
}

function appendLightboxItems(newItems) {
  if (!newItems.length) return
  ensureLightbox()
  const start = lightboxState.items.length
  lightboxState.items.push(...newItems)
  newItems.forEach((item, offset) => {
    item.el.dataset.lightboxBound = '1'
    item.el.addEventListener('click', (e) => {
      e.preventDefault()
      lightboxState.show(start + offset)
    })
  })
  rebuildLightboxThumbs()
}

function appendAlbumViewerLightboxItems(viewer) {
  appendLightboxItems(collectAlbumViewerItems(viewer))
}

function initLightbox() {
  const items = []

  document.querySelectorAll('.markdown-body img').forEach((el) => {
    if (!el.src || el.dataset.lightboxBound === '1') return
    items.push({ el, src: el.src, type: 'image', poster: el.src })
  })

  document.querySelectorAll('[data-lightbox="album"]').forEach((el) => {
    if (el.dataset.lightboxBound === '1') return
    const src = el.dataset.src || el.src || el.getAttribute('href')
    if (!src) return
    items.push({ el, src, type: 'image', poster: src })
  })

  if (!document.querySelector('.sakura-gallery-album-page.is-locked')) {
    items.push(...collectAlbumViewerItems())
  }

  appendLightboxItems(items)
}

function parseJsonData(el) {
  const raw = JSON.parse(el.textContent || '[]')
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

function formatNoticeMetaLine(categories, tags) {
  const cats = Array.isArray(categories) ? categories.join(' / ') : (categories || '')
  const tagList = Array.isArray(tags) ? tags.join(' · ') : (tags || '')
  if (!cats && !tagList) return ''
  if (cats && tagList) {
    return `<p class="notice-board-wrap__meta-line"><span class="notice-board-wrap__meta-item">${escapeHtml(cats)}</span><span class="notice-board-wrap__meta-sep">·</span><span class="notice-board-wrap__meta-item">${escapeHtml(tagList)}</span></p>`
  }
  const text = cats || tagList
  return `<p class="notice-board-wrap__meta-line"><span class="notice-board-wrap__meta-item">${escapeHtml(text)}</span></p>`
}

function initNoticeBoard() {
  const postsDataEl = document.getElementById('notice-posts-data')
  const noticeArticle = document.getElementById('notice-article')
  const noticeWrap = document.querySelector('.notice-board-wrap')
  if (!postsDataEl || !noticeArticle || !noticeWrap) return

  let posts = []
  try {
    posts = parseJsonData(postsDataEl)
  } catch (err) {
    console.warn('[notice-board]', err)
    return
  }
  if (!posts.length) return

  let current = 0
  let timer
  let wheelLocked = false
  let isHovered = false
  const interval = Number(noticeWrap.dataset.interval || 5000)

  const normalizeIndex = (index) => ((index % posts.length) + posts.length) % posts.length

  const render = (index) => {
    current = normalizeIndex(index)
    const post = posts[current]
    if (!post) return

    noticeArticle.innerHTML = `
      <a class="notice-board-wrap__article-link" href="${escapeHtml(post.url)}" aria-label="查看文章：${escapeHtml(post.title)}"></a>
      <div class="notice-board-wrap__cover-col">
        <div class="notice-board-wrap__dots" role="tablist" aria-label="文章切换">
          <div class="notice-board-wrap__dot-center" aria-hidden="true"></div>
          <div class="notice-board-wrap__dots-track">
            ${[-2, -1, 0, 1, 2].map((offset) => `<button type="button" class="notice-board-wrap__dot${offset === 0 ? ' is-active' : ''}" data-offset="${offset}" role="tab" aria-label="切换文章"></button>`).join('')}
          </div>
        </div>
        <div class="notice-board-wrap__cover-frame">
          <div class="notice-board-wrap__cover">
            <img class="sakura-lazy-img" src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="eager" fetchpriority="high" decoding="async">
          </div>
        </div>
      </div>
      <div class="notice-board-wrap__meta-col">
        <div class="notice-board-wrap__meta">
          <time class="notice-board-wrap__date" datetime="${escapeHtml(post.date || '')}">${escapeHtml(post.date || '')}</time>
          <h2 class="notice-board-wrap__post-heading">${escapeHtml(post.title)}</h2>
          ${formatNoticeMetaLine(post.categories, post.tags)}
          <div class="notice-board-wrap__excerpt-slot">
            <p class="notice-board-wrap__excerpt">${escapeHtml(post.excerpt || '')}</p>
          </div>
        </div>
      </div>`

    noticeArticle.querySelectorAll('.notice-board-wrap__dot').forEach((dot) => {
      dot.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const offset = Number(dot.dataset.offset || 0)
        if (offset) switchBy(offset)
      })
    })
    initLazyImages(noticeArticle)
  }

  const switchBy = (delta) => {
    if (!delta) return
    render(current + delta)
  }

  const startAutoRotate = () => {
    clearInterval(timer)
    if (posts.length <= 1 || isHovered) return
    timer = setInterval(() => {
      if (!isHovered) switchBy(1)
    }, interval)
  }

  const stopAutoRotate = () => {
    clearInterval(timer)
    timer = undefined
  }

  noticeArticle.addEventListener('mouseenter', () => {
    isHovered = true
    stopAutoRotate()
  })
  noticeArticle.addEventListener('mouseleave', () => {
    isHovered = false
    startAutoRotate()
  })
  noticeArticle.addEventListener('wheel', (event) => {
    if (posts.length <= 1 || wheelLocked) return
    event.preventDefault()
    if (Math.abs(event.deltaY) < 8) return
    wheelLocked = true
    switchBy(event.deltaY > 0 ? 1 : -1)
    window.setTimeout(() => { wheelLocked = false }, 320)
  }, { passive: false })

  render(0)
  if (posts.length > 1) {
    window.setTimeout(startAutoRotate, 3000)
  }
}

function parseRuntimeStart(since) {
  const trimmed = String(since || '').trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  }
  const start = new Date(trimmed)
  return Number.isNaN(start.getTime()) ? null : start
}

function initSiteRuntime() {
  const runtimeEl = document.getElementById('site-runtime')
  if (!runtimeEl) return

  const start = parseRuntimeStart(runtimeEl.dataset.since)
  if (!start) return

  const units = {
    days: runtimeEl.querySelector('[data-unit="days"]'),
    hours: runtimeEl.querySelector('[data-unit="hours"]'),
    minutes: runtimeEl.querySelector('[data-unit="minutes"]'),
    seconds: runtimeEl.querySelector('[data-unit="seconds"]'),
  }

  const tick = () => {
    let diffMs = Date.now() - start.getTime()
    if (diffMs < 0) diffMs = 0

    const days = Math.floor(diffMs / 86400000)
    diffMs -= days * 86400000
    const hours = Math.floor(diffMs / 3600000)
    diffMs -= hours * 3600000
    const minutes = Math.floor(diffMs / 60000)
    diffMs -= minutes * 60000
    const seconds = Math.floor(diffMs / 1000)

    if (units.days) units.days.textContent = String(days)
    if (units.hours) units.hours.textContent = String(hours)
    if (units.minutes) units.minutes.textContent = String(minutes)
    if (units.seconds) units.seconds.textContent = String(seconds)
  }

  tick()
  window.setInterval(tick, 1000)
}

function getPostListScrollTop() {
  const target = document.getElementById('home-post-list')
    || document.querySelector('.sakura-post-list')
  if (!target) return 0

  const navHeight = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sakura-navbar-height'),
    10,
  ) || 65

  return Math.max(0, window.scrollY + target.getBoundingClientRect().top - navHeight - 8)
}

function scrollToPostList() {
  const top = getPostListScrollTop()
  window.scrollTo({ top, left: 0, behavior: 'auto' })
  return top
}

function scheduleScrollToPostList() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToPostList()
    })
  })
}

function isHomePaginationPath(pathname) {
  const path = pathname.replace(/\/$/, '') || '/'
  return path === '/' || /^\/page\/\d+$/.test(path)
}

function initHomePaginationScroll() {
  if (!document.getElementById('home-post-list')) return

  const path = window.location.pathname
  const shouldScroll = window.location.hash === '#home-post-list'
    || /^\/page\/\d+\/?$/.test(path)

  if (!shouldScroll || !isHomePaginationPath(path)) return

  scheduleScrollToPostList()
}

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase()
}

function postMatchesCategory(rawCategories, categoryKey) {
  if (!categoryKey) return false
  if (categoryKey === 'Uncategorized') {
    return !rawCategories || (Array.isArray(rawCategories) && rawCategories.length === 0)
  }
  let cats = rawCategories
  if (typeof cats === 'string') {
    try { cats = JSON.parse(cats) } catch (_) { /* keep raw string */ }
  }
  if (!cats) return false
  if (typeof cats === 'string') return normalizeCategory(cats) === normalizeCategory(categoryKey)
  if (Array.isArray(cats)) {
    const key = normalizeCategory(categoryKey)
    if (!categoryKey.includes('/')) {
      return cats.some((item) => normalizeCategory(item) === key)
    }
    const joined = cats.map(normalizeCategory).join('/')
    const root = normalizeCategory(categoryKey.split('/')[0])
    return joined.startsWith(key) && normalizeCategory(cats[0]) === root
  }
  return false
}

function postMatchesTag(rawTags, tagKey) {
  if (!tagKey) return false
  let tags = rawTags
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags) } catch (_) { /* keep raw string */ }
  }
  if (!tags) return false
  if (typeof tags === 'string') return normalizeCategory(tags) === normalizeCategory(tagKey)
  if (Array.isArray(tags)) {
    const key = normalizeCategory(tagKey)
    return tags.some((item) => normalizeCategory(item) === key)
  }
  return false
}

function updateFilteredPostCards(postItems) {
  let visibleIndex = 0
  postItems.forEach((el) => {
    if (el.hidden) return
    const card = el.querySelector('.sakura-post-card')
    if (!card) return
    card.classList.remove('left', 'right')
    card.classList.add(visibleIndex % 2 === 0 ? 'right' : 'left')
    visibleIndex += 1
  })
}

function initCategoriesPage(textColor, primary) {
  const catDataEl = document.getElementById('categories-chart-data')
  const chartEl = document.getElementById('categories-chart')
  const postSection = document.getElementById('categories-post-section')
  if (!catDataEl || !chartEl || !postSection) return

  const postItems = Array.from(document.querySelectorAll('.categories-post-item'))
  const tagButtons = Array.from(document.querySelectorAll('.sakura-categories-page .sakura-tag-button[data-category]'))
  let currentCategory = ''

  const updatePostCardsLayout = () => updateFilteredPostCards(postItems)

  const setCategory = (categoryKey) => {
    currentCategory = categoryKey || ''
    const url = new URL(window.location.href)
    if (currentCategory) url.searchParams.set('category', currentCategory)
    else url.searchParams.delete('category')
    history.replaceState(null, '', url)

    tagButtons.forEach((btn) => {
      btn.classList.toggle('clicked', btn.dataset.category === currentCategory)
    })

    if (!currentCategory) {
      postSection.hidden = true
      postItems.forEach((el) => { el.hidden = true })
      return
    }

    postSection.hidden = false
    postItems.forEach((el) => {
      el.hidden = !postMatchesCategory(el.dataset.categories, currentCategory)
    })
    updatePostCardsLayout()
    initLazyImages(postSection)
  }

  const selectCategory = (categoryKey) => {
    if (!categoryKey) return
    setCategory(categoryKey)
    postSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  try {
    const data = parseJsonData(catDataEl).map((item) => ({
      ...item,
      categoryKey: item.categoryKey || item.name,
    }))
    const chart = echarts.init(chartEl)
    chart.setOption({
      title: { text: '文章分类统计图', left: 'center', textStyle: { color: textColor } },
      tooltip: { trigger: 'item', formatter: '{b} : {c}篇 ({d}%)' },
      legend: {
        top: 'bottom',
        data: data.map((item) => item.name),
        textStyle: { color: textColor },
        selectedMode: true,
      },
      color: [primary, '#ff8787', '#ff6b6b', '#fab005', '#fcc419', '#8E71C1', '#6e5494', '#8cb1b3'],
      series: [{
        name: '文章篇数',
        type: 'pie',
        radius: [30, 80],
        center: ['50%', '45%'],
        roseType: 'area',
        data,
        label: { color: textColor, formatter: '{b} : {c} ({d}%)' },
        itemStyle: {
          emphasis: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
      }],
    })
    chart.on('click', 'series', (event) => {
      const key = event.data?.categoryKey || event.data?.name
      if (key) selectCategory(String(key))
    })
    window.addEventListener('resize', () => chart.resize())

    tagButtons.forEach((btn) => {
      btn.addEventListener('click', () => selectCategory(btn.dataset.category || ''))
    })

    const initial = new URLSearchParams(window.location.search).get('category')
    if (initial) setCategory(initial)
  } catch (err) {
    console.warn('[categories-chart]', err)
  }
}

function initTagsPage(textColor, primary) {
  const tagDataEl = document.getElementById('tags-chart-data')
  const chartEl = document.getElementById('tags-chart')
  const postSection = document.getElementById('tags-post-section')
  if (!tagDataEl || !chartEl || !postSection) return

  const postItems = Array.from(document.querySelectorAll('.tags-post-item'))
  const tagButtons = Array.from(document.querySelectorAll('.sakura-tags-page .sakura-tag-button[data-tag]'))
  let currentTag = ''
  let chartData = []

  const resolveTagKey = (input) => {
    if (!input) return ''
    const normInput = normalizeCategory(input)
    const btn = tagButtons.find((item) => normalizeCategory(item.dataset.tag) === normInput)
    if (btn) return btn.dataset.tag || ''
    const item = chartData.find((entry) =>
      normalizeCategory(entry.tagKey) === normInput || normalizeCategory(entry.name) === normInput,
    )
    return item?.tagKey || input
  }

  const setTag = (tagKey) => {
    currentTag = resolveTagKey(tagKey)
    const url = new URL(window.location.href)
    if (currentTag) url.searchParams.set('tag', currentTag)
    else url.searchParams.delete('tag')
    history.replaceState(null, '', url)

    tagButtons.forEach((btn) => {
      btn.classList.toggle('clicked', normalizeCategory(btn.dataset.tag) === normalizeCategory(currentTag))
    })

    if (!currentTag) {
      postSection.hidden = true
      postItems.forEach((el) => { el.hidden = true })
      return
    }

    postSection.hidden = false
    postItems.forEach((el) => {
      el.hidden = !postMatchesTag(el.dataset.tags, currentTag)
    })
    updateFilteredPostCards(postItems)
    initLazyImages(postSection)
  }

  const selectTag = (tagKey) => {
    if (!tagKey) return
    setTag(tagKey)
    postSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  try {
    chartData = parseJsonData(tagDataEl).map((item) => ({
      ...item,
      tagKey: item.tagKey || item.name,
    }))
    const chart = echarts.init(chartEl)
    chart.setOption({
      title: {
        text: chartData.length ? `Top ${chartData.length} 标签统计图` : '标签统计图',
        left: 'center',
        textStyle: { color: textColor },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: chartData.length > 6 ? '20%' : '14%',
        top: '16%',
        containLabel: true,
      },
      tooltip: { formatter: '{b}<br/>文章篇数: {c}' },
      xAxis: {
        name: '标签',
        type: 'category',
        data: chartData.map((item) => item.name),
        axisLabel: { color: textColor, interval: 0 },
        axisLine: { lineStyle: { color: textColor } },
      },
      yAxis: {
        name: '文章篇数',
        type: 'value',
        splitLine: { show: false },
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: textColor } },
      },
      series: [{
        name: '文章篇数',
        type: 'bar',
        data: chartData,
        itemStyle: { color: primary },
        emphasis: { itemStyle: { color: primary } },
      }],
    })
    chart.on('click', 'series', (event) => {
      const item = chartData[event.dataIndex]
      const key = item?.tagKey || (typeof event.data === 'object' && event.data?.tagKey) || event.name
      if (key) selectTag(String(key))
    })
    window.addEventListener('resize', () => chart.resize())

    tagButtons.forEach((btn) => {
      btn.addEventListener('click', () => selectTag(btn.dataset.tag || ''))
    })

    const initial = new URLSearchParams(window.location.search).get('tag')
    if (initial) setTag(initial)
  } catch (err) {
    console.warn('[tags-chart]', err)
  }
}

function initCharts(retry) {
  if (!window.echarts) {
    if (!retry) window.addEventListener('load', () => initCharts(true), { once: true })
    return
  }
  const textColor = document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,.7)' : '#4c4948'
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--sakura-color-primary').trim() || '#DF9193'

  initCategoriesPage(textColor, primary)
  initTagsPage(textColor, primary)

  const archivesEl = document.getElementById('archives-chart')
  const archivesData = document.getElementById('archives-posts-data')
  if (archivesEl && archivesData) {
    try {
      const posts = parseJsonData(archivesData)
      const start = archivesEl.dataset.start || '2024-01'
      const months = []
      const counts = {}
      const [sy, sm] = start.split('-').map(Number)
      const now = new Date()
      let y = sy; let m = sm
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
        const key = `${y}-${String(m).padStart(2, '0')}`
        months.push(key)
        counts[key] = 0
        m++; if (m > 12) { m = 1; y++ }
      }
      posts.forEach((p) => {
        const key = String(p.date || '').replace(/^"+|"+$/g, '').slice(0, 7)
        if (counts[key] !== undefined) counts[key]++
      })
      const chart = echarts.init(archivesEl)
      chart.setOption({
        title: { text: '文章发布统计图', left: 'center', textStyle: { color: textColor } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: months, axisLabel: { color: textColor } },
        yAxis: { type: 'value', axisLabel: { color: textColor } },
        series: [{
          type: 'line', smooth: true, data: months.map(k => counts[k]),
          areaStyle: { color: 'rgba(223, 145, 147, 0.25)' },
          itemStyle: { color: primary },
          lineStyle: { color: primary },
        }],
      })
      window.addEventListener('resize', () => chart.resize())
    } catch (err) { console.warn('[archives-chart]', err) }
  }
}

function renderSearchResultItem(item) {
  const cover = escapeHtml(item.cover || '')
  const title = escapeHtml(item.title || '')
  const url = escapeHtml(item.url || '#')
  const excerpt = escapeHtml(item.excerpt || '')
  const date = escapeHtml(item.date || '')
  return `<article class="search-result-entry">
    <a class="search-result-entry__cover" href="${url}">
      <span class="search-result-entry__overlay" aria-hidden="true">
        <iconify-icon icon="fa6-regular:file-lines"></iconify-icon>
      </span>
      <img src="${cover}" alt="${title}" loading="lazy" decoding="async">
    </a>
    <div class="search-result-entry__body">
      <div class="search-result-entry__head">
        <h3 class="search-result-entry__title"><a href="${url}">${title}</a></h3>
        <div class="search-result-entry__date">
          <iconify-icon icon="mdi:clock-outline" aria-hidden="true"></iconify-icon>
          发布于 ${date}
        </div>
      </div>
      <p class="search-result-entry__excerpt">${excerpt}</p>
      <div class="search-result-entry__more">
        <a href="${url}" aria-label="阅读 ${title}">
          <span class="mashiro-dots"><span></span><span></span><span></span></span>
        </a>
      </div>
      <hr class="search-result-entry__divider">
    </div>
  </article>`
}

function initSearchPage() {
  const dataEl = document.getElementById('search-index-data')
  const input = document.getElementById('search-page-input')
  const results = document.getElementById('search-results')
  if (!dataEl || !input || !results || !window.Fuse) return
  try {
    const list = JSON.parse(dataEl.textContent || '[]')
    const fuse = new Fuse(list, { keys: ['title', 'tags', 'categories', 'excerpt', 'content'], threshold: 0.35, ignoreLocation: true })
    const render = (items) => {
      results.innerHTML = items.length
        ? items.map(({ item }) => renderSearchResultItem(item)).join('')
        : '<p class="search-results-empty">没有找到相关内容</p>'
    }
    const run = (q) => render(q ? fuse.search(q) : [])
    input.addEventListener('input', () => run(input.value.trim()))
    const q = new URLSearchParams(location.search).get('q')
    if (q) { input.value = q; run(q) }
  } catch (err) { console.warn('[search]', err) }
}

function initHomeNavbar() {
  const navbar = document.getElementById('navbar')
  const content = document.getElementById('navbar-content')
  const links = document.getElementById('navbar-links')
  if (!navbar || !content) return

  const isHome = document.documentElement.classList.contains('is-home')
  const offset = 0

  const update = () => {
    const scrolled = window.scrollY > offset
    const hovered = navbar.matches(':hover')
    const active = isHome ? (hovered || scrolled) : true

    content.classList.toggle('active-header', active)
    content.classList.toggle('has-scrolled', scrolled)

    if (links && isHome && window.innerWidth >= 768) {
      if (active) {
        links.classList.remove('sakura-fade-out-left', 'sakura-fade-out-right')
        links.classList.add('sakura-fade-in-left')
        links.style.visibility = 'visible'
        links.style.pointerEvents = 'auto'
      } else {
        links.classList.remove('sakura-fade-in-left', 'sakura-fade-in-right')
        links.classList.add('sakura-fade-out-left')
        links.style.visibility = 'hidden'
        links.style.pointerEvents = 'none'
      }
    } else if (links) {
      links.classList.remove(
        'sakura-fade-in-left', 'sakura-fade-out-left',
        'sakura-fade-in-right', 'sakura-fade-out-right',
      )
      links.style.visibility = 'visible'
      links.style.pointerEvents = 'auto'
    }
  }

  navbar.addEventListener('mouseenter', update)
  navbar.addEventListener('mouseleave', update)
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  update()
}

function initNavbarLinkScroll() {
  const links = document.getElementById('navbar-links')
  if (!links) return

  links.addEventListener('wheel', (e) => {
    if (links.scrollWidth <= links.clientWidth) return
    e.preventDefault()
    links.scrollLeft += e.deltaY
  }, { passive: false })
}

function initNavbarDropdown() {
  document.querySelectorAll('.sakura-dropdown[aria-haspopup="true"]').forEach((dropdown) => {
    dropdown.addEventListener('mouseenter', () => { dropdown.setAttribute('aria-expanded', 'true') })
    dropdown.addEventListener('mouseleave', () => { dropdown.setAttribute('aria-expanded', 'false') })
  })
}

function normalizeSidebarPath(path) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path
}

function isSidebarLinkActive(linkPath, currentPath) {
  if (linkPath === '/') return currentPath === '/'
  return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`)
}

function setSidebarGroupOpen(toggle, subItems, open) {
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  subItems.hidden = !open
  toggle.querySelector('.sidebar-nav-group__chevron')?.classList.toggle('is-open', open)
}

function initSidebar(closeSidebar) {
  const sidebar = document.getElementById('sidebar')
  if (!sidebar) return

  const currentPath = normalizeSidebarPath(window.location.pathname)

  sidebar.querySelectorAll('.sakura-sidebar-link-items .sakura-nav-link[href]').forEach((link) => {
    const href = link.getAttribute('href')
    if (!href) return
    let linkPath
    try {
      linkPath = normalizeSidebarPath(new URL(href, window.location.origin).pathname)
    } catch (_) {
      return
    }
    link.classList.toggle('is-active', isSidebarLinkActive(linkPath, currentPath))
  })

  sidebar.querySelectorAll('.sidebar-nav-group__toggle').forEach((toggle) => {
    const subItems = toggle.parentElement?.querySelector('.sakura-sidebar-link-sub-items')
    if (!subItems) return

    const hasActiveChild = [...subItems.querySelectorAll('.sakura-nav-link')].some((link) => link.classList.contains('is-active'))
    setSidebarGroupOpen(toggle, subItems, hasActiveChild)

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true'
      setSidebarGroupOpen(toggle, subItems, !isOpen)
    })
  })

  sidebar.querySelectorAll('.sakura-sidebar-link .sakura-nav-link').forEach((link) => {
    link.addEventListener('click', () => closeSidebar(false))
  })
}

function initBrandRotate() {
  const el = document.querySelector('.sakura-hvr-rotate')
  if (!el) return

  el.addEventListener('mouseenter', () => {
    el.classList.remove('is-spinning')
    void el.offsetWidth
    el.classList.add('is-spinning')
  })
  el.addEventListener('animationend', () => {
    el.classList.remove('is-spinning')
  })
}

function parseHeroUrls() {
  const dataEl = document.getElementById('hero-urls-data')
  if (!dataEl) return []
  try {
    const raw = JSON.parse(dataEl.textContent || '[]')
    const urls = typeof raw === 'string' ? JSON.parse(raw) : raw
    return urls.map((u) => {
      if (/^https?:\/\//i.test(u)) return u
      try { return new URL(u, window.location.origin).href } catch (_) { return u }
    })
  } catch (_) {
    return []
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitTransition(el) {
  return new Promise((resolve) => {
    const done = () => resolve()
    el.addEventListener('transitionend', done, { once: true })
    setTimeout(done, 1100)
  })
}

async function waitHeroMediaReady(el) {
  if (!el) return
  if (el.tagName === 'VIDEO') {
    await new Promise((resolve) => {
      if (el.readyState >= 2) {
        resolve()
        return
      }
      el.addEventListener('loadeddata', () => resolve(), { once: true })
      el.addEventListener('error', () => resolve(), { once: true })
    })
    return
  }
  if (el.tagName === 'IMG') {
    await new Promise((resolve) => {
      if (el.complete && el.naturalWidth > 0) {
        resolve()
        return
      }
      el.addEventListener('load', () => resolve(), { once: true })
      el.addEventListener('error', () => resolve(), { once: true })
    })
    if (el.decode) {
      try { await el.decode() } catch (_) { /* ignore decode errors */ }
    }
  }
}

const heroMedia = {
  urls: [],
  currentIndex: 0,
  transitioning: false,
  playerActive: false,
  resumeIndex: 0,
}

function resolveHeroUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  try { return new URL(url, window.location.origin).href } catch (_) { return url }
}

function buildHeroMediaItem(url, options = {}) {
  const { loop = true, muted = true, playerMode = false } = options
  const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
  let el
  if (isVideo) {
    el = document.createElement('video')
    el.className = 'sakura-hero-media-item sakura-hero__video'
    if (playerMode) el.classList.add('sakura-hero__video--player')
    el.src = url
    el.autoplay = true
    el.loop = loop
    el.muted = muted
    el.playsInline = true
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
    if (muted) el.setAttribute('muted', '')
    if (playerMode) {
      el.addEventListener('ended', () => { stopHeroPlayer() })
    }
  } else {
    el = document.createElement('img')
    el.className = 'sakura-hero-media-item sakura-hero-background-img'
    el.src = url
    el.alt = ''
    el.decoding = 'async'
    el.loading = 'eager'
    el.fetchPriority = 'high'
    el.addEventListener('error', () => el.classList.add('is-error'), { once: true })
  }
  el.setAttribute('aria-hidden', 'true')
  return el
}

function setHeroPlayerUi(active) {
  const hero = document.getElementById('hero')
  const navbar = document.getElementById('navbar')
  const mediaWrap = hero?.querySelector('.sakura-hero__media')
  const icon = document.getElementById('hero-player-icon')
  const fadeTargets = [
    hero?.querySelector('.sakura-hero__content'),
    hero?.querySelector('.sakura-hero__scroll'),
    hero?.querySelector('.sakura-hero__waves'),
  ].filter(Boolean)

  hero?.classList.toggle('is-player-active', active)
  mediaWrap?.classList.toggle('is-player-active', active)

  navbar?.classList.toggle('sakura-fade-out-up', active)
  navbar?.classList.toggle('sakura-fade-in-down', !active)

  fadeTargets.forEach((el) => {
    el.classList.toggle('sakura-fade-out-down', active)
    el.classList.toggle('sakura-fade-in-up', !active)
  })

  if (icon) {
    icon.src = active ? (icon.dataset.pauseSrc || icon.src) : (icon.dataset.playSrc || icon.src)
  }
  document.getElementById('hero-player-btn')?.setAttribute('aria-label', active ? '暂停视频' : '播放视频')
}

async function showHeroPlayerVideo(url) {
  const stage = document.getElementById('hero-media-stage')
  if (!stage || !url) return

  const item = buildHeroMediaItem(url, { loop: false, muted: false, playerMode: true })
  item.classList.add('is-current', 'hero-fade-enter-active', 'hero-fade-enter-from')
  stage.replaceChildren(item)
  await waitHeroMediaReady(item)

  await wait(20)
  item.classList.remove('hero-fade-enter-from')
  item.classList.add('hero-fade-enter-to')
  await wait(500)
  settleHeroMediaItem(item)

  try { await item.play() } catch (_) { /* ignore autoplay errors */ }
}

async function stopHeroPlayer() {
  if (!heroMedia.playerActive) return

  heroMedia.playerActive = false
  document.getElementById('hero-media-stage')?.querySelector('video')?.pause()
  setHeroPlayerUi(false)

  if (!heroMedia.urls.length) return

  heroMedia.transitioning = true
  try {
    await showInitialHeroMedia(heroMedia.urls[heroMedia.resumeIndex])
    heroMedia.currentIndex = heroMedia.resumeIndex
  } finally {
    heroMedia.transitioning = false
  }
}

async function startHeroPlayer() {
  const btn = document.getElementById('hero-player-btn')
  const playerUrl = resolveHeroUrl(btn?.dataset.playerUrl)
  if (!playerUrl || heroMedia.playerActive || heroMedia.transitioning) return

  heroMedia.playerActive = true
  heroMedia.resumeIndex = heroMedia.currentIndex
  setHeroPlayerUi(true)
  await showHeroPlayerVideo(playerUrl)
}

function toggleHeroPlayer() {
  if (heroMedia.playerActive) stopHeroPlayer()
  else startHeroPlayer()
}

function initHeroPlayer() {
  const btn = document.getElementById('hero-player-btn')
  if (!btn?.dataset.playerUrl) return
  btn.addEventListener('click', () => toggleHeroPlayer())
}

function settleHeroMediaItem(el) {
  el.classList.remove('hero-fade-enter-active', 'hero-fade-enter-from', 'hero-fade-enter-to')
  el.style.transform = ''
  el.style.opacity = ''
}

async function showInitialHeroMedia(url) {
  const stage = document.getElementById('hero-media-stage')
  if (!stage || !url) return

  const item = buildHeroMediaItem(url)
  item.classList.add('is-current', 'hero-fade-enter-active', 'hero-fade-enter-from')
  stage.replaceChildren(item)
  await waitHeroMediaReady(item)

  await wait(20)
  item.classList.remove('hero-fade-enter-from')
  item.classList.add('hero-fade-enter-to')
  await wait(500)
  settleHeroMediaItem(item)
}

async function slideHeroMedia(fromUrl, toUrl, direction) {
  const stage = document.getElementById('hero-media-stage')
  if (!stage || !fromUrl || !toUrl) return

  const outgoing = buildHeroMediaItem(fromUrl)
  const incoming = buildHeroMediaItem(toUrl)
  await waitHeroMediaReady(incoming)
  const track = document.createElement('div')
  track.className = 'sakura-hero-media-track'

  if (direction === 'next') {
    track.append(outgoing, incoming)
    track.style.transform = 'translateX(0)'
  } else {
    track.append(incoming, outgoing)
    track.style.transform = 'translateX(-50%)'
  }

  stage.replaceChildren(track)
  await wait(20)

  if (direction === 'next') {
    track.style.transform = 'translateX(-50%)'
  } else {
    track.style.transform = 'translateX(0)'
  }

  await waitTransition(track)

  incoming.classList.add('is-current')
  settleHeroMediaItem(incoming)
  stage.replaceChildren(incoming)
}

function initHeroMedia() {
  const media = document.getElementById('hero-media')
  const urls = parseHeroUrls()
  if (!media || !urls.length) return

  heroMedia.urls = urls
  const imageUrls = urls.filter((url) => !/\.(mp4|webm|ogg)(\?.*)?$/i.test(url))
  const initialPool = imageUrls.length ? imageUrls : urls
  heroMedia.currentIndex = urls.indexOf(initialPool[Math.floor(Math.random() * initialPool.length)])
  if (heroMedia.currentIndex < 0) heroMedia.currentIndex = 0

  const show = async (direction) => {
    if (heroMedia.transitioning || heroMedia.playerActive) return
    heroMedia.transitioning = true
    try {
      if (direction === 'fade') {
        await showInitialHeroMedia(urls[heroMedia.currentIndex])
        return
      }

      const targetIndex = direction === 'next'
        ? (heroMedia.currentIndex + 1) % urls.length
        : (heroMedia.currentIndex - 1 + urls.length) % urls.length

      await slideHeroMedia(urls[heroMedia.currentIndex], urls[targetIndex], direction)
      heroMedia.currentIndex = targetIndex
    } finally {
      heroMedia.transitioning = false
    }
  }

  show('fade')

  const prefetchHeroUrls = urls.filter((_, i) => i !== heroMedia.currentIndex)
  prefetchHeroUrls.forEach((url) => {
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  })

  const prev = document.getElementById('hero-media-prev')
  const next = document.getElementById('hero-media-next')
  prev?.addEventListener('click', () => show('prev'))
  next?.addEventListener('click', () => show('next'))
  prev?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prev.click() }
  })
  next?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next.click() }
  })

  initHeroPlayer()
}

async function fetchHitokotoText() {
  const res = await fetch('https://v1.hitokoto.cn/?encode=json', { cache: 'no-store' })
  if (!res.ok) throw new Error('hitokoto failed')
  const data = await res.json()
  if (!data?.hitokoto) throw new Error('hitokoto empty')
  return data.hitokoto
}

function typeWriter(el, text, speed = 80) {
  return new Promise((resolve) => {
    el.textContent = ''
    el.classList.add('is-typing')
    let i = 0
    const tick = () => {
      if (i >= text.length) {
        el.classList.remove('is-typing')
        resolve()
        return
      }
      el.textContent += text.charAt(i)
      i += 1
      setTimeout(tick, speed)
    }
    tick()
  })
}

async function initHeroHitokoto() {
  const el = document.getElementById('hero-hitokoto')
  if (!el) return

  const fallback = el.dataset.fallback || ''
  const enableHitokoto = el.dataset.enableHitokoto !== 'false'
  const useTypewriter = el.dataset.typewriter !== 'false'
  const speed = Number(el.dataset.speed || 80)

  let text = fallback
  if (enableHitokoto) {
    try {
      text = await fetchHitokotoText()
    } catch (_) {
      text = fallback
    }
  }

  if (useTypewriter) {
    await typeWriter(el, text, speed)
  } else {
    el.textContent = text
  }
}

function scrollPastHero() {
  const hero = document.getElementById('hero')
  const target = document.getElementById('home-posts')
  if (!hero && !target) return

  const navHeight = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sakura-navbar-height'), 10) || 65
  const top = target
    ? target.getBoundingClientRect().top + window.scrollY - navHeight
    : Math.max(0, hero.getBoundingClientRect().bottom + window.scrollY - navHeight)

  window.scrollTo({ top, behavior: 'smooth' })
}

const CODE_FOLD_LINE_THRESHOLD = 10

function countCodeLines(text) {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\n$/, '')
  if (!normalized) return 0
  return normalized.split('\n').length
}

function bindCodeBlock(block) {
  if (block.dataset.codeBlockReady) return
  block.dataset.codeBlockReady = '1'

  const copyBtn = block.querySelector('button.copy')
  const unfoldBtn = block.querySelector('button.code-block-unfold-btn')
  const codeEl = block.querySelector('pre code') || block.querySelector('code')

  if (copyBtn && codeEl) {
    copyBtn.addEventListener('click', async () => {
      const text = codeEl.textContent || ''
      try {
        await navigator.clipboard.writeText(text)
        copyBtn.classList.add('copied')
        window.setTimeout(() => copyBtn.classList.remove('copied'), 2000)
      } catch {
        /* clipboard unavailable */
      }
    })
  }

  if (!unfoldBtn) return

  unfoldBtn.addEventListener('click', () => {
    const folded = block.classList.contains('folded')
    if (folded) {
      block.classList.remove('folded', 'max-h-360px')
      unfoldBtn.classList.add('is-expanded')
    } else {
      block.classList.add('folded', 'max-h-360px')
      unfoldBtn.classList.remove('is-expanded')
    }
  })
}

function wrapLegacyCodeBlock(highlight) {
  if (highlight.closest('[class*="language-"]')) return null

  const pre = highlight.querySelector('pre')
  const code = pre?.querySelector('code')
  const langMatch = code?.className.match(/language-([A-Za-z0-9_+#.-]+)/)
  const lang = code?.getAttribute('data-lang') || langMatch?.[1] || 'text'
  const lineCount = countCodeLines(code?.textContent || '')
  const fold = lineCount > CODE_FOLD_LINE_THRESHOLD

  const wrapper = document.createElement('div')
  wrapper.className = `language-${lang}${fold ? ' max-h-360px code-foldable folded' : ''}`
  wrapper.dataset.lineCount = String(lineCount)

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.title = 'Copy code'
  copyBtn.className = 'copy'
  copyBtn.setAttribute('aria-label', '复制代码')

  const langSpan = document.createElement('span')
  langSpan.className = 'lang'
  langSpan.textContent = lang

  const unfoldBtn = document.createElement('button')
  unfoldBtn.type = 'button'
  unfoldBtn.className = 'code-block-unfold-btn'
  unfoldBtn.setAttribute('aria-label', '展开代码')
  if (!fold) unfoldBtn.hidden = true

  const parent = highlight.parentNode
  if (!parent) return null
  parent.insertBefore(wrapper, highlight)
  wrapper.append(copyBtn, langSpan, highlight, unfoldBtn)
  return wrapper
}

function initPostSponsor(root = document) {
  root.querySelectorAll('.sakura-sponsor').forEach((wrap) => {
    const btn = wrap.querySelector('.sakura-sponsor__toggle')
    const panel = wrap.querySelector('.sakura-sponsor__panel')
    if (!btn || !panel) return

    btn.addEventListener('click', () => {
      const open = panel.classList.toggle('is-open')
      btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  })
}

function initMarkdownCodeBlocks(root = document) {
  const container = root.querySelector('.markdown-body') || root
  if (!container) return

  container.querySelectorAll('.highlight').forEach((highlight) => {
    wrapLegacyCodeBlock(highlight)
  })

  container.querySelectorAll('div[class*="language-"]').forEach((block) => {
    bindCodeBlock(block)
  })
}

function initPostImageRows() {
  document.querySelectorAll('.sakura-post-page .markdown-body.sakura-post-content').forEach((body) => {
    if (body.dataset.imageRowsReady === '1') return
    body.dataset.imageRowsReady = '1'

    const isImageOnlyElement = (el) => {
      if (el.tagName === 'IMG') return true
      if (el.tagName !== 'P') return false
      const children = [...el.childNodes]
      return children.some((node) => node.nodeType === 1 && node.tagName === 'IMG')
        && children.every((node) => {
          if (node.nodeType === 3) return node.textContent.trim() === ''
          if (node.nodeType === 1) return node.tagName === 'IMG' || node.tagName === 'BR'
          return false
        })
    }

    const getImagesFromElement = (el) => (
      el.tagName === 'IMG' ? [el] : [...el.querySelectorAll(':scope > img')]
    )

    const buildImageRows = (imgs) => {
      const fragment = document.createDocumentFragment()
      for (let i = 0; i < imgs.length; i += 2) {
        const row = document.createElement('div')
        row.className = 'post-image-row'
        const pair = imgs.slice(i, i + 2)
        if (pair.length === 1) row.classList.add('post-image-row--single')
        pair.forEach((img) => {
          const item = document.createElement('div')
          item.className = 'post-image-row__item'
          item.appendChild(img)
          row.appendChild(item)
        })
        fragment.appendChild(row)
      }
      return fragment
    }

    const findConsecutiveImgRuns = (parent) => {
      const runs = []
      let current = []
      for (const node of parent.childNodes) {
        if (node.nodeType === 1 && node.tagName === 'IMG') {
          current.push(node)
        } else if (
          current.length > 0
          && ((node.nodeType === 3 && node.textContent.trim() === '')
            || (node.nodeType === 1 && node.tagName === 'BR'))
        ) {
          continue
        } else {
          if (current.length >= 2) runs.push([...current])
          current = []
        }
      }
      if (current.length >= 2) runs.push(current)
      return runs
    }

    const hasMeaningfulContentBesides = (parent, excludeNodes) => (
      [...parent.childNodes].some((node) => {
        if (excludeNodes.includes(node)) return false
        if (node.nodeType === 3) return node.textContent.trim() !== ''
        if (node.nodeType === 1) return node.tagName !== 'BR'
        return true
      })
    )

    const wrapImgRun = (paragraph, imgs) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'post-image-group'
      wrapper.appendChild(buildImageRows(imgs))
      if (hasMeaningfulContentBesides(paragraph, imgs)) {
        paragraph.insertAdjacentElement('afterend', wrapper)
      } else {
        paragraph.replaceWith(wrapper)
      }
    }

    body.querySelectorAll('p').forEach((paragraph) => {
      if (paragraph.closest('.post-image-group')) return
      findConsecutiveImgRuns(paragraph)
        .reverse()
        .forEach((imgs) => wrapImgRun(paragraph, imgs))
    })

    const wrapImages = (imgs, insertBefore, removeNodes = []) => {
      if (imgs.length < 2) return
      const wrapper = document.createElement('div')
      wrapper.className = 'post-image-group'
      wrapper.appendChild(buildImageRows(imgs))
      insertBefore.parentNode.insertBefore(wrapper, insertBefore)
      removeNodes.forEach((node) => node.remove())
    }

    const flushBatch = (batch) => {
      if (!batch.length) return
      const imgs = batch.flatMap(getImagesFromElement)
      if (imgs.length < 2) return
      wrapImages(imgs, batch[0], batch)
    }

    const batchContainers = [body, ...body.querySelectorAll('li, blockquote')]
    batchContainers.forEach((container) => {
      let batch = []
      ;[...container.children].forEach((node) => {
        if (node.nodeType === 1 && isImageOnlyElement(node) && getImagesFromElement(node).length === 1) {
          batch.push(node)
          return
        }
        flushBatch(batch)
        batch = []
      })
      flushBatch(batch)
    })
  })
}

function initLazyImages(root = document) {
  root.querySelectorAll('.markdown-body img:not([loading])').forEach((img) => {
    img.loading = 'lazy'
    img.decoding = 'async'
    img.classList.add('sakura-lazy-img')
  })

  root.querySelectorAll('img.sakura-lazy-img, img[loading="lazy"]').forEach((img) => {
    if (img.dataset.lazyReady) return
    img.dataset.lazyReady = '1'
    const reveal = () => img.classList.add('is-loaded')
    if (img.complete && img.naturalWidth > 0) reveal()
    else {
      img.addEventListener('load', reveal, { once: true })
      img.addEventListener('error', reveal, { once: true })
    }
  })
}

function initPostToc() {
  const aside = document.querySelector('.sakura-post-toc')
  const inner = aside?.querySelector('.sakura-toc__inner')
  const marker = aside?.querySelector('.outline-marker')
  const links = inner ? [...inner.querySelectorAll('#TableOfContents a[href^="#"]')] : []
  if (!aside || !inner || !links.length) return

  const navHeight = () => Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sakura-navbar-height'), 10) || 65

  const headings = links.map((link) => {
    const id = decodeURIComponent(link.getAttribute('href').slice(1))
    return document.getElementById(id)
  }).filter(Boolean)

  const setActive = (activeLink) => {
    links.forEach((link) => link.classList.toggle('active', link === activeLink))
    if (!marker || !activeLink) return
    const innerRect = inner.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    marker.classList.add('is-visible')
    marker.style.top = `${linkRect.top - innerRect.top + inner.scrollTop}px`
    marker.style.height = `${Math.max(linkRect.height, 18)}px`
  }

  const onScroll = () => {
    const offset = window.scrollY + navHeight() + 24
    let current = links[0]
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].offsetTop <= offset) current = links[i]
      else break
    }
    setActive(current)
  }

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const id = decodeURIComponent(link.getAttribute('href').slice(1))
      const target = document.getElementById(id)
      if (!target) return
      window.scrollTo({ top: target.offsetTop - navHeight() - 12, behavior: 'smooth' })
      history.replaceState(null, '', `#${id}`)
    })
  })

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
}
