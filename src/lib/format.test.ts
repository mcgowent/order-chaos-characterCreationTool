import { fmt, parseIntInput, relativeDate, signed } from './format';

describe('format helpers', () => {
  it('formats thousands', () => {
    expect(fmt(93001)).toBe('93,001');
    expect(fmt(0)).toBe('0');
  });

  it('signs bonuses with a true minus', () => {
    expect(signed(2)).toBe('+2');
    expect(signed(0)).toBe('0');
    expect(signed(-1)).toBe('−1');
  });

  it('parses integer input', () => {
    expect(parseIntInput('93,001')).toBe(93001);
    expect(parseIntInput(' 12 ')).toBe(12);
    expect(parseIntInput('')).toBeNull();
    expect(parseIntInput('abc')).toBeNull();
  });

  it('formats relative dates', () => {
    const now = new Date(2026, 10, 10, 15, 0);
    expect(relativeDate(new Date(2026, 10, 10, 9, 42).toISOString(), now)).toBe('today, 9:42 AM');
    expect(relativeDate(new Date(2026, 10, 9, 20, 0).toISOString(), now)).toBe('yesterday');
    expect(relativeDate(new Date(2026, 10, 4, 12).toISOString(), now)).toBe('Nov 4');
    expect(relativeDate(new Date(2025, 10, 4, 12).toISOString(), now)).toBe('Nov 4, 2025');
  });
});
