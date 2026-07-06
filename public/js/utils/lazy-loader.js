// js/utils/lazy-loader.js
class LazyLoader {
  constructor() {
    this.loadedSections = new Set()
    this.observers = new Map()
    this.loadingQueue = []
    this.isProcessing = false
  }

  observe(sectionId, loadFn, options = {}) {
    const el = document.getElementById(sectionId)
    if (!el || this.loadedSections.has(sectionId)) return

    this.showSkeleton(el, options.skeleton)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.loadedSections.has(sectionId)) {
          this.queueLoad(sectionId, loadFn, el)
          observer.unobserve(el)
        }
      })
    }, {
      rootMargin: options.rootMargin || '200px',
      threshold: 0.01
    })

    observer.observe(el)
    this.observers.set(sectionId, observer)
  }

  async queueLoad(sectionId, loadFn, el) {
    this.loadingQueue.push({ sectionId, loadFn, el })
    if (!this.isProcessing) this.processQueue()
  }

  async processQueue() {
    this.isProcessing = true
    while (this.loadingQueue.length > 0) {
      const { sectionId, loadFn, el } = this.loadingQueue.shift()
      if (this.loadedSections.has(sectionId)) continue

      try {
        await loadFn()
        this.loadedSections.add(sectionId)
        this.hideSkeleton(el)
      } catch (err) {
        console.error(`Lazy load failed for ${sectionId}:`, err)
        this.showError(el)
      }
    }
    this.isProcessing = false
  }

  showSkeleton(el, customSkeleton) {
    if (customSkeleton) {
      el.innerHTML = customSkeleton
      return
    }
    el.innerHTML = `
      <div class="lazy-skeleton">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    `
  }

  hideSkeleton(el) {
    const skeleton = el.querySelector('.lazy-skeleton')
    if (skeleton) {
      skeleton.style.opacity = '0'
      setTimeout(() => skeleton.remove(), 300)
    }
  }

  showError(el) {
    el.innerHTML = `
      <div class="lazy-error">
        <span>Failed to load section</span>
        <button onclick="location.reload()">Retry</button>
      </div>
    `
  }

  async loadCritical(sections) {
    const promises = sections.map(({ id, fn }) => {
      const el = document.getElementById(id)
      if (el && !this.loadedSections.has(id)) {
        return fn().then(() => {
          this.loadedSections.add(id)
          this.hideSkeleton(el)
        }).catch(err => console.error(`Critical load failed ${id}:`, err))
      }
    })
    await Promise.all(promises.filter(Boolean))
  }
}

export const lazyLoader = new LazyLoader()
