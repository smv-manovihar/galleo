import { describe, it, expect } from 'vitest';
import { parseExifDate, resolveTargetDate } from '../date-inference';

describe('parseExifDate', () => {
  it('parses standard EXIF date original strings: YYYY:MM:DD HH:MM:SS', () => {
    const d = parseExifDate('2024:03:15 10:30:45');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
    expect(d!.getMonth()).toBe(2); // March
    expect(d!.getDate()).toBe(15);
    expect(d!.getHours()).toBe(10);
  });

  it('parses fallback standard dates', () => {
    const d = parseExifDate('2024-03-15T10:30:45.000Z');
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2024);
  });

  it('returns null for empty or invalid dates', () => {
    expect(parseExifDate(null)).toBeNull();
    expect(parseExifDate('')).toBeNull();
    expect(parseExifDate('invalid-date')).toBeNull();
    expect(parseExifDate('2024:13:45 99:99:99')).toBeNull();
  });
});

describe('resolveTargetDate', () => {
  const mockBirthTime = new Date(2021, 5, 10, 8, 0, 0).toISOString();
  const mockMTime = new Date(2022, 10, 20, 15, 30, 0).toISOString();

  it('prioritizes EXIF date original when available', () => {
    const res = resolveTargetDate({
      exifDateOriginal: '2024:03:15 10:30:45',
      filename: 'IMG_20231225_143022.jpg', // conflicts with exif
      fsBirthTime: mockBirthTime,
      fsMTime: mockMTime,
    });
    expect(res.source).toBe('exif');
    expect(new Date(res.targetDate).getFullYear()).toBe(2024);
  });

  it('prioritizes filename date when EXIF is missing', () => {
    const res = resolveTargetDate({
      exifDateOriginal: null,
      filename: 'IMG_20231225_143022.jpg',
      fsBirthTime: mockBirthTime,
      fsMTime: mockMTime,
    });
    expect(res.source).toBe('filename');
    expect(new Date(res.targetDate).getFullYear()).toBe(2023);
    expect(new Date(res.targetDate).getMonth()).toBe(11); // Dec
  });

  it('falls back to filesystem creation date if EXIF and filename dates are missing', () => {
    const res = resolveTargetDate({
      exifDateOriginal: undefined,
      filename: 'vacation_photo.jpg',
      fsBirthTime: mockBirthTime,
      fsMTime: mockMTime,
    });
    expect(res.source).toBe('filesystem');
    expect(new Date(res.targetDate).getFullYear()).toBe(2021);
    expect(new Date(res.targetDate).getMonth()).toBe(5); // June
  });

  it('falls back to filesystem modified date if birthtime is missing/invalid', () => {
    const res = resolveTargetDate({
      exifDateOriginal: undefined,
      filename: 'vacation_photo.jpg',
      fsBirthTime: '1970-01-01T00:00:00.000Z', // filtered out as invalid/epoch fallback
      fsMTime: mockMTime,
    });
    expect(res.source).toBe('filesystem');
    expect(new Date(res.targetDate).getFullYear()).toBe(2022);
    expect(new Date(res.targetDate).getMonth()).toBe(10); // Nov
  });

  it('hard fallbacks to current date if everything is missing or invalid', () => {
    const res = resolveTargetDate({
      filename: 'vacation.jpg',
    });
    expect(res.source).toBe('filesystem');
    expect(Math.abs(new Date(res.targetDate).getTime() - Date.now())).toBeLessThan(5000);
  });
});
