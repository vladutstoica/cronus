import renderFavicon from '../assets/render-inverted.png'

const specialFavicons: Record<string, string | { light: string; dark: string }> = {
  'github.com': {
    light: 'https://github.githubassets.com/favicons/favicon.svg',
    dark: 'https://github.githubassets.com/favicons/favicon-dark.svg'
  },
  'render.com': {
    dark: renderFavicon,
    light: 'https://www.google.com/s2/favicons?domain=render.com&sz=64'
  },
  'docs.google.com': 'https://i.imgur.com/AMyUwdr.png',
  'sheets.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/6a/a3/2ecde2c245d5b9b88429cb47ee13/google-sheets.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'slides.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/66/c5/8716b9e44f4d80560a493456e672/google-slides.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'calendar.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/cf/3c/0d56042f479fac9ad22d06855578/calender.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'meet.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/23/2e/f8262b124f86a3f1de3e14356cc3/google-meet.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'drive.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/e8/4f/69d708b2455397d7b88b0312f7c5/google-drive.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'mail.google.com':
    'https://www.gstatic.com/marketing-cms/assets/images/66/ac/14b165e647fd85c824bfbe5d6bc5/gmail.webp=s96-fcrop64=1,00000000ffffffff-rw',
  'claude.ai': 'https://claude.ai/images/claude_app_icon.png',
  'web.whatsapp.com': 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  'wa.me': 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg'
}

function getCurrentTheme(): 'light' | 'dark' {
  const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
  const theme = storedTheme || 'system'

  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function getFaviconURL(url: string): string {
  const theme = getCurrentTheme()
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    const pathname = parsedUrl.pathname

    if (hostname === 'docs.google.com') {
      if (pathname.startsWith('/spreadsheets')) {
        return specialFavicons['sheets.google.com'] as string
      }
      if (pathname.startsWith('/presentation')) {
        return specialFavicons['slides.google.com'] as string
      }
      return specialFavicons['docs.google.com'] as string
    }

    const faviconInfo = specialFavicons[hostname]
    if (faviconInfo) {
      if (typeof faviconInfo === 'string') {
        return faviconInfo
      }
      return faviconInfo[theme]
    }
  } catch (e) {
    // Fall through to original logic for invalid URLs
  }

  const root = getRootOfURL(url)
  return `https://icons.duckduckgo.com/ip3/${root}.ico`
}

function getRootOfURL(url: string): string {
  try {
    return new URL(url).hostname
  } catch (e) {
    return ''
  }
}

export function getGoogleFaviconURL(url: string): string {
  const root = getRootOfURL(url)
  return `https://www.google.com/s2/favicons?domain=${root}&sz=64`
}
