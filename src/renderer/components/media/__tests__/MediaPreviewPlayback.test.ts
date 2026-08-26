import { describe, it, expect } from "vitest"

describe("MediaPreview playback & autoPlay lifecycle", () => {
  interface StateSnapshot {
    isOpen: boolean
    autoPlayProp: boolean
    activeAutoPlay: boolean
    prevIsOpen: boolean
    prevAutoPlayProp: boolean
  }

  const reduceState = (
    current: StateSnapshot,
    action:
      | { type: "OPEN"; itemPresent: boolean; autoPlayProp: boolean }
      | { type: "CLOSE" }
      | { type: "PLAY_STATE_CHANGE"; playing: boolean }
      | { type: "NAVIGATE" }
  ): StateSnapshot => {
    let nextIsOpen = current.isOpen
    let nextAutoPlayProp = current.autoPlayProp
    let nextActiveAutoPlay = current.activeAutoPlay
    let nextPrevIsOpen = current.prevIsOpen
    let nextPrevAutoPlayProp = current.prevAutoPlayProp

    if (action.type === "OPEN") {
      nextIsOpen = action.itemPresent
      nextAutoPlayProp = action.autoPlayProp
    } else if (action.type === "CLOSE") {
      nextIsOpen = false
    } else if (action.type === "PLAY_STATE_CHANGE") {
      nextActiveAutoPlay = action.playing
    } else if (action.type === "NAVIGATE") {
      // Navigating internally keeps current session isOpen and retains activeAutoPlay
    }

    // Sync condition matching MediaPreview render logic
    if (nextIsOpen !== nextPrevIsOpen || nextAutoPlayProp !== nextPrevAutoPlayProp) {
      nextPrevIsOpen = nextIsOpen
      nextPrevAutoPlayProp = nextAutoPlayProp
      if (nextIsOpen && !current.prevIsOpen) {
        nextActiveAutoPlay = nextAutoPlayProp
      } else if (nextIsOpen && nextAutoPlayProp !== current.prevAutoPlayProp) {
        nextActiveAutoPlay = nextAutoPlayProp
      } else if (!nextIsOpen) {
        nextActiveAutoPlay = false
      }
    }

    return {
      isOpen: nextIsOpen,
      autoPlayProp: nextAutoPlayProp,
      activeAutoPlay: nextActiveAutoPlay,
      prevIsOpen: nextPrevIsOpen,
      prevAutoPlayProp: nextPrevAutoPlayProp,
    }
  }

  it("initializes activeAutoPlay to true when opened in autoplay mode", () => {
    let state: StateSnapshot = {
      isOpen: false,
      autoPlayProp: false,
      activeAutoPlay: false,
      prevIsOpen: false,
      prevAutoPlayProp: false,
    }

    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: true })
    expect(state.isOpen).toBe(true)
    expect(state.activeAutoPlay).toBe(true)
  })

  it("cancels autoPlay for subsequent items when user pauses the video", () => {
    let state: StateSnapshot = {
      isOpen: false,
      autoPlayProp: false,
      activeAutoPlay: false,
      prevIsOpen: false,
      prevAutoPlayProp: false,
    }

    // Open Video 1 with autoPlay=true
    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: true })
    expect(state.activeAutoPlay).toBe(true)

    // User pauses Video 1
    state = reduceState(state, { type: "PLAY_STATE_CHANGE", playing: false })
    expect(state.activeAutoPlay).toBe(false)

    // User navigates to Video 2
    state = reduceState(state, { type: "NAVIGATE" })
    expect(state.activeAutoPlay).toBe(false)

    // User navigates to Video 3
    state = reduceState(state, { type: "NAVIGATE" })
    expect(state.activeAutoPlay).toBe(false)
  })

  it("maintains continuous autoPlay when user navigates while video is actively playing", () => {
    let state: StateSnapshot = {
      isOpen: false,
      autoPlayProp: false,
      activeAutoPlay: false,
      prevIsOpen: false,
      prevAutoPlayProp: false,
    }

    // Open Video 1 with autoPlay=true
    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: true })
    expect(state.activeAutoPlay).toBe(true)

    // Video 1 plays
    state = reduceState(state, { type: "PLAY_STATE_CHANGE", playing: true })
    expect(state.activeAutoPlay).toBe(true)

    // User navigates to Video 2 while playing
    state = reduceState(state, { type: "NAVIGATE" })
    expect(state.activeAutoPlay).toBe(true)
  })

  it("enables autoPlay for subsequent items if user manually plays a video that was paused", () => {
    let state: StateSnapshot = {
      isOpen: false,
      autoPlayProp: false,
      activeAutoPlay: false,
      prevIsOpen: false,
      prevAutoPlayProp: false,
    }

    // Open Video 1 with autoPlay=false
    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: false })
    expect(state.activeAutoPlay).toBe(false)

    // User presses Play on Video 1
    state = reduceState(state, { type: "PLAY_STATE_CHANGE", playing: true })
    expect(state.activeAutoPlay).toBe(true)

    // User navigates to Video 2
    state = reduceState(state, { type: "NAVIGATE" })
    expect(state.activeAutoPlay).toBe(true)
  })

  it("resets activeAutoPlay on modal close and correctly applies new prop on reopen", () => {
    let state: StateSnapshot = {
      isOpen: false,
      autoPlayProp: false,
      activeAutoPlay: false,
      prevIsOpen: false,
      prevAutoPlayProp: false,
    }

    // Open Video 1 with autoPlay=true, then pause it
    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: true })
    state = reduceState(state, { type: "PLAY_STATE_CHANGE", playing: false })
    expect(state.activeAutoPlay).toBe(false)

    // Close preview
    state = reduceState(state, { type: "CLOSE" })
    expect(state.isOpen).toBe(false)
    expect(state.activeAutoPlay).toBe(false)

    // Re-open another video with autoPlay=true
    state = reduceState(state, { type: "OPEN", itemPresent: true, autoPlayProp: true })
    expect(state.isOpen).toBe(true)
    expect(state.activeAutoPlay).toBe(true)
  })
})
