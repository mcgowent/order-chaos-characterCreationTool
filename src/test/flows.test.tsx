import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestApp } from '../App';
import { seedData, STORAGE_KEY } from '../store/storage';
import { parseImportText } from '../store/backup';
import { prepareImport, validateAppData } from '../rules';

const setup = (path: string) => {
  const user = userEvent.setup();
  render(<TestApp path={path} initial={seedData()} />);
  return user;
};

const meter = (name: string) => screen.getByRole('meter', { name });
const essenceInput = () => screen.getByRole('textbox', { name: 'Available Essence' }) as HTMLInputElement;
const currentInput = (name: string) => screen.getByLabelText(`Current ${name}`) as HTMLInputElement;

describe('Library', () => {
  it('lists the seeded characters, filters live, sorts and toggles view (AC1, AC2)', async () => {
    const user = setup('/');
    expect(screen.getByText('6 characters · Open a sheet to review stats while you write.')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Characters' });
    expect(within(list).getAllByRole('link')).toHaveLength(7); // 6 cards + New character
    // Recently edited first
    expect(within(list).getAllByRole('heading')[0]).toHaveTextContent('Caldor Miles');
    // Long names are present in full (clamped by CSS) with the full name as title
    expect(screen.getByTitle('Seraphine Ashvale-Corrigan')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'ember');
    expect(within(list).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Oswin Thale', 'Torv Ashgrin']);

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No characters match “zzz”')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort characters' }), 'level');
    expect(within(screen.getByRole('list', { name: 'Characters' })).getAllByRole('heading')[0]).toHaveTextContent('Ilyth of the Quiet Vale');

    await user.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('arcane-knight:library-view')).toBe('list');
  });

  it('opens a sheet from a card', async () => {
    const user = setup('/');
    await user.click(screen.getByRole('link', { name: /Open Caldor Miles/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Caldor Miles' })).toBeInTheDocument();
  });

  it('redirects unknown ids with a notice', async () => {
    setup('/character/nope');
    expect(await screen.findByText('Character not found')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Character Library' })).toBeInTheDocument();
  });
});

describe('Create (AC3)', () => {
  it('rolls 10–15, re-rolls, requires a name and opens at Level 1 with full resources', async () => {
    const user = setup('/new');
    const values = () => ['constitution', 'intellect', 'endurance', 'core', 'concentration', 'strength']
      .map((k) => Number(screen.getByTestId(`roll-${k}`).textContent));
    for (const v of values()) expect(v).toBeGreaterThanOrEqual(10), expect(v).toBeLessThanOrEqual(15);
    expect(screen.getByText(/Roll 1 ·/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roll Starting Attributes' }));
    expect(screen.getByText(/Roll 2 ·/)).toBeInTheDocument();
    for (const v of values()) expect(v).toBeGreaterThanOrEqual(10), expect(v).toBeLessThanOrEqual(15);

    const create = screen.getByRole('button', { name: 'Create Character' });
    expect(create).toBeDisabled();
    expect(screen.getByText('Add a name to create this character.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name/), '   ');
    expect(create).toBeDisabled();
    await user.clear(screen.getByLabelText(/Name/));
    await user.type(screen.getByLabelText(/Name/), 'Vess Morrow');
    await user.type(screen.getByLabelText('Classification'), 'Ashen Lamplighter of the 9th Ward!');
    await user.type(screen.getByLabelText('Species'), 'Moth-kin (half)');
    const [con, int, end] = values();
    expect(create).toBeEnabled();
    await user.click(create);

    expect(await screen.findByRole('heading', { level: 1, name: 'Vess Morrow' })).toBeInTheDocument();
    expect(screen.getByText('Ashen Lamplighter of the 9th Ward!')).toBeInTheDocument();
    expect(screen.getByText('Moth-kin (half)')).toBeInTheDocument();
    expect(screen.getByText('Next: Level 2')).toBeInTheDocument();
    expect(meter('Health')).toHaveAttribute('aria-valuenow', String(con! * 10));
    expect(meter('Health')).toHaveAttribute('aria-valuemax', String(con! * 10));
    expect(meter('Mana')).toHaveAttribute('aria-valuenow', String(int! * 10));
    expect(meter('Stamina')).toHaveAttribute('aria-valuenow', String(end! * 10));
  });

  it('asks before discarding a typed name', async () => {
    const user = setup('/new');
    await user.type(screen.getByLabelText(/Name/), 'Draft');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard this character?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText(/Name/)).toHaveValue('Draft');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard' }));
    expect(await screen.findByRole('heading', { name: 'Character Library' })).toBeInTheDocument();
  });
});

describe('Character Sheet', () => {
  it('shows the worked example exactly (AC4)', () => {
    setup('/character/c-caldor');
    const totals = { constitution: '43', intellect: '37', endurance: '31', core: '21', concentration: '28', strength: '44' };
    for (const [k, v] of Object.entries(totals)) expect(screen.getByTestId(`total-${k}`)).toHaveTextContent(v);
    expect(meter('Health')).toHaveAttribute('aria-valuemax', '430');
    expect(meter('Mana')).toHaveAttribute('aria-valuemax', '370');
    expect(meter('Stamina')).toHaveAttribute('aria-valuemax', '310');
    expect(currentInput('Health').value).toBe('430');
    expect(currentInput('Mana').value).toBe('370');
    expect(currentInput('Stamina').value).toBe('295');
    expect(screen.getByText('+43 / min')).toBeInTheDocument();
    expect(screen.getByText('+65 / min')).toBeInTheDocument();
    expect(screen.getByText('+31 / min')).toBeInTheDocument();
    expect(screen.getByText('Essence to reach Level 6')).toBeInTheDocument();
    expect(screen.getByTestId('essence-to-next')).toHaveTextContent('2,250');
    expect(essenceInput()).toHaveValue('93,001');
    expect(screen.getByRole('meter', { name: 'Reputation progress' })).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByText('6% toward Rank 3')).toBeInTheDocument();
    expect(screen.getByText('10 / 18')).toBeInTheDocument();
  });

  it('purchases and allocates points (AC5) with undo', async () => {
    const user = setup('/character/c-caldor');
    const plusCon = screen.getByRole('button', { name: 'Allocate 1 point to Constitution' });
    expect(plusCon).toBeDisabled();
    expect(screen.getByText('Allocation buttons are disabled until unspent points are available.')).toBeInTheDocument();

    expect(screen.getByTestId('next-point-price')).toHaveTextContent('Next point 844 Essence · 0 bought at Level 5');
    const inc = screen.getByRole('button', { name: 'Increase points to purchase' });
    await user.click(inc);
    await user.click(inc);
    // 844 + 1,055 + 1,319
    expect(screen.getByText('3,218 Essence')).toBeInTheDocument();
    expect(screen.getByText('89,783')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Purchase 3 points' }));

    expect(essenceInput()).toHaveValue('89,783');
    expect(screen.getByText('Purchased 3 points')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase 1 point' })).toBeInTheDocument(); // qty reset
    expect(screen.getByTestId('next-point-price')).toHaveTextContent('Next point 1,648 Essence · 3 bought at Level 5');
    expect(plusCon).toBeEnabled();

    await user.click(plusCon);
    expect(screen.getByTestId('total-constitution')).toHaveTextContent('44');
    expect(meter('Health')).toHaveAttribute('aria-valuemax', '440');
    expect(screen.getByText('+44 / min')).toBeInTheDocument();
    expect(currentInput('Health').value).toBe('430');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('total-constitution')).toHaveTextContent('43');
  });

  it('disables purchase when cost exceeds Essence (AC6)', async () => {
    const data = seedData();
    data.characters[0]!.essence = 1900; // 2 points cost 1,899; 3 cost 3,218
    const user = userEvent.setup();
    render(<TestApp path="/character/c-caldor" initial={data} />);
    const inc = screen.getByRole('button', { name: 'Increase points to purchase' });
    await user.click(inc);
    expect(screen.getByRole('button', { name: 'Purchase 2 points' })).toBeEnabled();
    await user.click(inc);
    expect(screen.getByRole('button', { name: 'Purchase 3 points' })).toBeDisabled();
    expect(screen.getByText('Not enough Essence')).toBeInTheDocument();
  });

  it('advances a level after confirming (AC7)', async () => {
    const user = setup('/character/c-caldor');
    await user.click(screen.getByRole('button', { name: 'Advance to Level 6' }));
    const pop = screen.getByRole('dialog', { name: 'Advance to Level 6?' });
    expect(pop).toHaveTextContent('2,250 Essence');
    await user.click(within(pop).getByRole('button', { name: 'Advance' }));
    expect(screen.getByText('Next: Level 7')).toBeInTheDocument();
    expect(essenceInput()).toHaveValue('90,751');
    expect(screen.getByText('Unspent points').querySelector('.pill')).toHaveTextContent('2');
    // The next amount comes from the curve: Level 6 → 7 costs 5,400
    expect(screen.getByTestId('essence-to-next')).toHaveTextContent('5,400');
    expect(screen.getByRole('button', { name: 'Advance to Level 7' })).toBeEnabled();
  });

  it('shows Max level at Level 120', () => {
    const data = seedData();
    data.characters[0]!.level = 120;
    render(<TestApp path="/character/c-caldor" initial={data} />);
    expect(screen.getAllByText('Max level').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Advance to Level/ })).not.toBeInTheDocument();
  });

  it('clamps current resources and restores to max (AC8)', async () => {
    const user = setup('/character/c-caldor');
    const stamina = currentInput('Stamina');
    await user.clear(stamina);
    await user.type(stamina, '9999{Enter}');
    expect(currentInput('Stamina').value).toBe('310');
    await user.clear(currentInput('Mana'));
    await user.type(currentInput('Mana'), '12');
    await user.tab();
    expect(currentInput('Mana').value).toBe('12');
    await user.click(screen.getByRole('button', { name: 'Restore all to max' }));
    expect(currentInput('Mana').value).toBe('370');
  });

  it('edits essence and author-entered values', async () => {
    const user = setup('/character/c-caldor');
    const essence = essenceInput();
    await user.clear(essence);
    await user.type(essence, '1200{Enter}');
    expect(essence).toHaveValue('1,200');
    expect(screen.getByRole('button', { name: 'Advance to Level 6' })).toBeDisabled();
    expect(screen.getByText('Needs 2,250 Essence — 1,200 available.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Progress toward next rank/ }));
    const pct = screen.getByRole('textbox', { name: /Progress toward next rank/ });
    await user.clear(pct);
    await user.type(pct, '250{Enter}');
    expect(screen.getByText('100% toward Rank 3')).toBeInTheDocument();
  });

  it('edits identity in a modal that traps focus and closes on Esc (AC11)', async () => {
    const user = setup('/character/c-caldor');
    const open = screen.getByRole('button', { name: 'Edit identity' });
    await user.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Edit identity' });
    expect(within(dialog).getByLabelText(/Name/)).toHaveFocus();
    // Tab cycles within the dialog
    for (let i = 0; i < 8; i++) await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();

    await user.click(open);
    const name = screen.getByLabelText(/Name/);
    await user.clear(name);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(name, 'Caldor Miles the Younger');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Caldor Miles the Younger');
  });

  it('deletes a character after confirming', async () => {
    const user = setup('/character/c-torv');
    await user.click(screen.getByRole('button', { name: 'Edit identity' }));
    await user.click(screen.getByRole('button', { name: 'Delete character' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByText('Deleted “Torv Ashgrin”')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/^5 characters/)).toBeInTheDocument());
  });
});

describe('Equipment (AC9)', () => {
  it('has 18 slots, live totals, and clamps current when an item is removed', async () => {
    const user = setup('/character/c-caldor/equipment');
    const slots = screen.getAllByRole('button', { pressed: false }).filter((b) => b.hasAttribute('data-slot'));
    expect(slots).toHaveLength(18);
    expect(screen.getByRole('button', { name: 'Head: Helm of the Vigil Ward, +2 CON · +1 INT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Waist: empty' })).toBeInTheDocument();
    expect(screen.getByText('No slot selected')).toBeInTheDocument();

    // Bonus change updates totals immediately
    await user.click(screen.getByRole('button', { name: /^Chest:/ }));
    expect(screen.getByRole('button', { name: /^Chest:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Increase Constitution bonus' }));
    expect(screen.getByTestId('gear-total-constitution')).toHaveTextContent('44');
    expect(screen.getByTestId('gear-max-health')).toHaveTextContent('440');
    await user.click(screen.getByRole('button', { name: 'Decrease Constitution bonus' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('No slot selected')).toBeInTheDocument();

    // Negative bonus on an empty slot creates the item
    await user.click(screen.getByRole('button', { name: 'Waist: empty' }));
    await user.click(screen.getByRole('button', { name: 'Decrease Endurance bonus' }));
    expect(screen.getByRole('button', { name: 'Waist: Unnamed item, −1 END' })).toBeInTheDocument();
    expect(screen.getByTestId('gear-total-endurance')).toHaveTextContent('30');
    await user.click(screen.getByRole('button', { name: 'Empty slot' }));
    expect(screen.getByRole('button', { name: 'Waist: empty' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByText('No slot selected')).toBeInTheDocument();

    // Removing the helm lowers max health 430 → 410 and clamps current (430 → 410)
    await user.click(screen.getByRole('button', { name: /^Head:/ }));
    await user.click(screen.getByRole('button', { name: 'Empty slot' }));
    expect(screen.getByTestId('gear-max-health')).toHaveTextContent('410');

    // The Character Sheet reflects the same totals
    await user.click(screen.getByRole('link', { name: 'Character Sheet' }));
    expect(await screen.findByTestId('total-constitution')).toHaveTextContent('41');
    expect(meter('Health')).toHaveAttribute('aria-valuemax', '410');
    expect(currentInput('Health').value).toBe('410');
    expect(screen.getByText('9 / 18')).toBeInTheDocument();
  });

  it('moves between slots with arrow keys', async () => {
    const user = setup('/character/c-caldor/equipment');
    screen.getByRole('button', { name: /^Head:/ }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /^Neck:/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Neck' })).toBeInTheDocument();
  });

  it('names an item', async () => {
    const user = setup('/character/c-caldor/equipment');
    await user.click(screen.getByRole('button', { name: 'Feet: empty' }));
    await user.type(screen.getByLabelText(/Item name/), 'Boots of Striding');
    expect(screen.getByRole('button', { name: 'Feet: Boots of Striding' })).toBeInTheDocument();
  });
});

describe('Persistence and backup (AC10)', () => {
  it('saves to localStorage and reloads', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TestApp path="/character/c-caldor" />);
    // First launch seeds and persists
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).characters).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Purchase 1 point' }));
    expect(await screen.findByText('All changes saved', {}, { timeout: 2000 })).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).characters[0].essence).toBe(92157));
    unmount();
    render(<TestApp path="/character/c-caldor" />);
    expect(essenceInput()).toHaveValue('92,157');
    expect(screen.getByTestId('next-point-price')).toHaveTextContent('Next point 1,055 Essence · 1 bought at Level 5');
  });

  it('round-trips export → import with new ids for duplicates', () => {
    const data = seedData();
    const parsed = parseImportText(JSON.stringify(data, null, 2));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.characters).toEqual(validateAppData(data).characters);
    let n = 0;
    const added = prepareImport(parsed.characters, data.characters.map((c) => c.id), () => `fresh-${++n}`);
    expect(added.map((c) => c.id)).toEqual(['fresh-1', 'fresh-2', 'fresh-3', 'fresh-4', 'fresh-5', 'fresh-6']);
    expect(added[0]).toEqual({ ...data.characters[0], id: 'fresh-1' });
  });

  it('rejects invalid import files', () => {
    expect(parseImportText('nope')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    const r = parseImportText(JSON.stringify({ version: 1, characters: [{ id: 'x' }] }));
    expect(r.ok).toBe(false);
  });
});
