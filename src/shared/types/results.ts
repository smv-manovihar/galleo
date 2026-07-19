export type AppError =
  | { code: "FILE_NOT_FOUND"; path: string }
  | { code: "PERMISSION_DENIED"; path: string }
  | { code: "FILE_BUSY"; path: string }
  | { code: "DISK_FULL"; requiredBytes: number; path: string }
  | { code: "CORRUPT_DB"; detail: string }
  | { code: "EXIF_FAILED"; path: string; reason: string }
  | { code: "THUMBNAIL_FAILED"; path: string; reason: string }
  | { code: "UNKNOWN"; message: string }

export type Result<T, E = AppError> =
  { ok: true; data: T } | { ok: false; error: E }

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data }
}

export function fail<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
