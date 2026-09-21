// Native pinch zoom changes the visible viewport without resizing the layout
// viewport. Keep fixed canvas chrome inside that visible area in CSS pixels.
export function observeVisualViewport(targetWindow, onChange) {
  const viewport = targetWindow.visualViewport
  const update = () => {
    onChange({
      '--os-viewport-left': `${viewport?.offsetLeft ?? 0}px`,
      '--os-viewport-top': `${viewport?.offsetTop ?? 0}px`,
      '--os-viewport-width': `${viewport?.width ?? targetWindow.innerWidth}px`,
      '--os-viewport-height': `${viewport?.height ?? targetWindow.innerHeight}px`,
    })
  }

  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  targetWindow.addEventListener('resize', update)
  update()

  return () => {
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    targetWindow.removeEventListener('resize', update)
  }
}
