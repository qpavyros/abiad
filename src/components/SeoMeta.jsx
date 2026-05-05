import { useEffect } from 'react'

const SITE_URL = 'https://abiad.systems'
const DEFAULT_IMAGE = `${SITE_URL}/dualpos-dashboard.png`

function upsertMeta(attr, key, content) {
  if (!content) return
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function SeoMeta({ title, description, path }) {
  useEffect(() => {
    const fullUrl = `${SITE_URL}${path}`
    const fullTitle = title.includes('DualPOS') ? title : `${title} | DualPOS`

    document.title = fullTitle
    upsertCanonical(fullUrl)

    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', fullUrl)
    upsertMeta('property', 'og:image', DEFAULT_IMAGE)
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', DEFAULT_IMAGE)
  }, [title, description, path])

  return null
}

export default SeoMeta
