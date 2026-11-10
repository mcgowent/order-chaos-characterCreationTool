import seed from '../../data/sample-characters.json';
import { prepareImport, validateAppData, validateCharacter, ValidationError } from './validate';

describe('validateAppData', () => {
  it('accepts the seed file', () => {
    const data = validateAppData(seed);
    expect(data.characters).toHaveLength(6);
    expect(data.characters[0]!.equipment.head?.name).toBe('Helm of the Vigil Ward');
  });

  it('round-trips through JSON', () => {
    const data = validateAppData(seed);
    expect(validateAppData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it('rejects bad documents', () => {
    expect(() => validateAppData(null)).toThrow(ValidationError);
    expect(() => validateAppData({ version: 2, characters: [] })).toThrow(/version/);
    expect(() => validateAppData({ version: 1 })).toThrow(/characters/);
  });

  it('rejects bad characters', () => {
    const good = structuredClone(seed.characters[0]);
    expect(() => validateCharacter({ ...good, name: '   ' })).toThrow(/name/);
    expect(() => validateCharacter({ ...good, level: 0 })).toThrow(/level/);
    expect(() => validateCharacter({ ...good, essence: 1.5 })).toThrow(/essence/);
    expect(() => validateCharacter({ ...good, reputation: { rank: 1, progress: 101 } })).toThrow(/progress/);
    expect(() => validateCharacter({ ...good, equipment: { hat: { name: '', bonuses: {} } } })).toThrow(/slot/);
    expect(() => validateCharacter({ ...good, portrait: 'http://x' })).toThrow(/portrait/);
  });

  it('allows negative bonuses and drops zero bonuses', () => {
    const good = structuredClone(seed.characters[0]);
    const c = validateCharacter({ ...good, equipment: { head: { name: '', bonuses: { constitution: -2, core: 0 } } } });
    expect(c.equipment.head!.bonuses).toEqual({ constitution: -2 });
  });
});

describe('prepareImport', () => {
  it('gives duplicates new ids and never overwrites', () => {
    const chars = validateAppData(seed).characters.slice(0, 2);
    let n = 0;
    const out = prepareImport([...chars, chars[0]!], ['c-caldor'], () => `new-${++n}`);
    expect(out.map((c) => c.id)).toEqual(['new-1', 'c-seraphine', 'new-2']);
    expect(chars[0]!.id).toBe('c-caldor');
  });
});
