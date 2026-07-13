function cloneLayout(layout) {
  return {
    cards: layout.cards.map((card) => ({ ...card })),
    transform: { ...layout.transform },
  }
}

function layoutsEqual(left, right) {
  if (!left || !right || left.cards.length !== right.cards.length) return false
  const transformEqual = left.transform.scale === right.transform.scale
    && left.transform.panX === right.transform.panX
    && left.transform.panY === right.transform.panY
  if (!transformEqual) return false

  return left.cards.every((card, index) => {
    const other = right.cards[index]
    return card.id === other.id
      && card.x === other.x
      && card.y === other.y
      && card.width === other.width
      && card.height === other.height
      && card.visible === other.visible
  })
}

export function createHistory(initial) {
  return { past: [], present: cloneLayout(initial), future: [] }
}

export function pushHistory(history, next) {
  if (layoutsEqual(history.present, next)) {
    return {
      past: history.past.map(cloneLayout),
      present: cloneLayout(history.present),
      future: history.future.map(cloneLayout),
    }
  }

  return {
    past: [...history.past, cloneLayout(history.present)].slice(-50),
    present: cloneLayout(next),
    future: [],
  }
}

export function undoHistory(history) {
  if (history.past.length === 0) {
    return {
      past: [],
      present: cloneLayout(history.present),
      future: history.future.map(cloneLayout),
    }
  }

  return {
    past: history.past.slice(0, -1).map(cloneLayout),
    present: cloneLayout(history.past.at(-1)),
    future: [cloneLayout(history.present), ...history.future.map(cloneLayout)],
  }
}

export function resetHistory(_history, defaults) {
  return createHistory(defaults)
}
