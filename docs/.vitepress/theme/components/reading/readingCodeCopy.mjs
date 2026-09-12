async function copyText(text, document, isActive) {
  const clipboard = document.defaultView?.navigator?.clipboard
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return
    } catch {
      // Embedded readers can reject the Clipboard API even when it exists.
    }
  }
  if (!isActive()) throw new Error('The code reader was closed')

  const previousFocus = document.activeElement
  const selection = document.getSelection?.()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : []
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.setAttribute('aria-hidden', 'true')
  input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;font-size:16px'
  document.body.append(input)

  let copied = false
  try {
    input.select()
    copied = document.execCommand('copy')
  } finally {
    // Restore only the focus taken by our temporary input. Never pull focus
    // back if the reader has moved it elsewhere while copying.
    const restoreFocus = document.activeElement === input
    input.remove()
    if (restoreFocus) {
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true })
      if (selection && ranges.length) {
        selection.removeAllRanges()
        for (const range of ranges) selection.addRange(range)
      }
    }
  }
  if (!copied) throw new Error('Clipboard access was denied')
}

export function installReadingCodeCopy(panel, { filename, onStatus }) {
  const button = panel?.querySelector('div[class*="language-"] > button.copy')
  const code = button?.parentElement?.querySelector('pre code')
  if (!button || !code) return () => {}

  const document = panel.ownerDocument
  let pending = false
  let disposed = false
  let reset
  button.setAttribute('type', 'button')
  button.setAttribute('aria-label', `复制 ${filename} 的代码`)
  button.setAttribute('title', '复制代码')

  async function onClick(event) {
    if (event.target?.closest?.('button.copy') !== button) return
    // VitePress delegates clicks to window. Capture this one button to keep
    // its markup and highlighting without issuing a second clipboard write.
    event.stopPropagation()
    event.preventDefault()
    if (pending || disposed) return
    pending = true
    clearTimeout(reset)
    button.classList.remove('copied')
    button.setAttribute('aria-disabled', 'true')
    onStatus('复制中…')

    try {
      const clone = code.cloneNode(true)
      clone.querySelectorAll('.vp-copy-ignore, .diff.remove').forEach((node) => node.remove())
      let text = clone.textContent || ''
      if (/language-(shellscript|shell|bash|sh|zsh)\b/.test(button.parentElement.className)) {
        text = text.replace(/^ *(\$|>) /gm, '').trim()
      }
      await copyText(text, document, () => !disposed && button.isConnected)
      if (disposed) return
      button.classList.add('copied')
      button.setAttribute('title', '已复制')
      onStatus('代码已复制')
      reset = setTimeout(() => {
        button.classList.remove('copied')
        button.setAttribute('title', '复制代码')
        onStatus('')
      }, 4000)
    } catch {
      if (!disposed) {
        button.setAttribute('title', '重试复制')
        onStatus('复制未完成，请选中代码手动复制。')
      }
    } finally {
      pending = false
      button.removeAttribute('aria-disabled')
    }
  }

  panel.addEventListener('click', onClick, true)
  return () => {
    disposed = true
    clearTimeout(reset)
    button.removeAttribute('aria-disabled')
    panel.removeEventListener('click', onClick, true)
  }
}
