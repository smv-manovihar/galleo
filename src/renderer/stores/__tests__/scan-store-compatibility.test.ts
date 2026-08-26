import { describe, it, expect, beforeEach, vi } from "vitest"
import type { LibraryCompatibilityStatus } from "../../../shared/types/ipc"

vi.mock("../../../shared/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared/constants")>()
  return {
    ...actual,
    FORCE_SHOW_COMPATIBILITY_DIALOG: false,
  }
})

// Import useScanStore after mocking constants
import { useScanStore } from "../scan-store"

describe("useScanStore Library Compatibility", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = {
      api: {
        checkLibraryCompatibility: vi.fn(),
        checkScanInterrupted: vi.fn().mockResolvedValue(false),
      },
    }
    useScanStore.setState({
      compatibilityStatus: null,
      showCompatibilityDialog: false,
      isScanning: false,
    })
  })

  it("sets compatibilityStatus and opens dialog when needsForceRescan is true", async () => {
    const mockStatus: LibraryCompatibilityStatus = {
      isCompatible: false,
      needsForceRescan: true,
      issueType: "missing_data",
      reasons: ["Database table is missing columns: exact_hash, orientation"],
      wasScanInterrupted: false,
      currentIndexVersion: 5,
      lastIndexedVersion: 3,
      missingColumns: ["exact_hash", "orientation"],
      itemsWithMissingDataCount: 15,
      totalItemsCount: 50,
    }

    vi.mocked(globalThis.window.api.checkLibraryCompatibility).mockResolvedValue(mockStatus)

    await useScanStore.getState().checkLibraryCompatibility()

    const state = useScanStore.getState()
    expect(state.compatibilityStatus).toEqual(mockStatus)
    expect(state.showCompatibilityDialog).toBe(true)
  })

  it("does not open dialog when library is already compatible", async () => {
    const mockStatus: LibraryCompatibilityStatus = {
      isCompatible: true,
      needsForceRescan: false,
      issueType: null,
      reasons: [],
      wasScanInterrupted: false,
      currentIndexVersion: 5,
      lastIndexedVersion: 5,
      missingColumns: [],
      itemsWithMissingDataCount: 0,
      totalItemsCount: 50,
    }

    vi.mocked(globalThis.window.api.checkLibraryCompatibility).mockResolvedValue(mockStatus)

    await useScanStore.getState().checkLibraryCompatibility()

    const state = useScanStore.getState()
    expect(state.compatibilityStatus).toEqual(mockStatus)
    expect(state.showCompatibilityDialog).toBe(false)
  })

  it("dismisses dialog when dismissCompatibilityDialog is called", () => {
    useScanStore.setState({ showCompatibilityDialog: true })
    expect(useScanStore.getState().showCompatibilityDialog).toBe(true)

    useScanStore.getState().dismissCompatibilityDialog()
    expect(useScanStore.getState().showCompatibilityDialog).toBe(false)
  })
})
