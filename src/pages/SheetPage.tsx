import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmt } from '../lib/format';
import { useIsPhone } from '../lib/useMediaQuery';
import { essenceToNextLevel, type Character } from '../rules';
import { CharacterHeader, IdentityDialog, PhoneBar, PhoneIdentity } from '../components/CharacterHeader';
import { Dialog } from '../components/Dialog';
import { SaveStatus } from '../components/SaveStatus';
import { EssenceIcon } from '../components/Icons';
import { useSheet } from './sheet/useSheet';
import {
  AttributesPanel,
  EssenceTileBody,
  LevelTileBody,
  PhoneResourcesPanel,
  PointsPanel,
  ReputationTileBody,
  ResourcesPanel,
} from './sheet/SheetPanels';
import './SheetPage.css';

type TileKey = 'level' | 'essence' | 'reputation';

export function SheetPage({ character: c }: { character: Character }) {
  const s = useSheet(c);
  const isPhone = useIsPhone();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [phoneTile, setPhoneTile] = useState<TileKey | null>(null);
  const next = c.level + 1;
  const toNext = essenceToNextLevel(c.level);
  const { rank, progress } = c.reputation;

  const identityDialog = editing && <IdentityDialog c={c} onClose={() => setEditing(false)} />;

  if (isPhone) {
    const tileTitles: Record<TileKey, string> = { level: 'Level', essence: 'Available Essence', reputation: 'Reputation' };
    return (
      <>
        <PhoneBar
          title="Character Sheet"
          backTo="/"
          backLabel="Back to Library"
          items={[
            { label: 'Edit identity', onSelect: () => setEditing(true) },
            { label: 'Equipment', onSelect: () => navigate(`/character/${c.id}/equipment`) },
            { label: 'Restore all resources to max', onSelect: s.restoreAll },
          ]}
        />
        <main className="page page--sheet sheet sheet--phone">
          <PhoneIdentity c={c} onEdit={() => setEditing(true)} />
          <section aria-label="Progress" className="ptiles">
            <button type="button" className="ptile" onClick={() => setPhoneTile('level')} aria-label={`Level ${c.level}. ${toNext == null ? 'Max level' : `${fmt(toNext)} Essence to Level ${next}`}. Open`}>
              <span className="ptile__label">LEVEL</span>
              <span className="ptile__level">{c.level}</span>
              <span className="ptile__sub">{toNext == null ? 'Max level' : `${fmt(toNext)} to Lv ${next}`}</span>
            </button>
            <button type="button" className="ptile" onClick={() => setPhoneTile('essence')} aria-label={`Essence ${fmt(c.essence)} available. Edit`}>
              <span className="ptile__label">ESSENCE</span>
              <span className="ptile__essence num">{fmt(c.essence)}</span>
              <span className="ptile__sub">available</span>
            </button>
            <button type="button" className="ptile" onClick={() => setPhoneTile('reputation')} aria-label={`Reputation rank ${rank}, ${progress}% to Rank ${rank + 1}. Edit`}>
              <span className="ptile__label">REPUTATION</span>
              <span className="ptile__rank">Rank {rank}</span>
              <span className="ptile__bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>
              <span className="ptile__sub">{progress}% to Rank {rank + 1}</span>
            </button>
          </section>
          <PhoneResourcesPanel c={c} s={s} />
          <AttributesPanel c={c} s={s} phone />
          <PointsPanel c={c} s={s} phone />
        </main>
        {phoneTile && (
          <Dialog title={tileTitles[phoneTile]} variant="sheet" onClose={() => setPhoneTile(null)}>
            <div className={`tile tile--in-sheet tile--${phoneTile}`}>
              {phoneTile === 'level' && <LevelTileBody c={c} s={s} />}
              {phoneTile === 'essence' && <EssenceTileBody c={c} s={s} />}
              {phoneTile === 'reputation' && <ReputationTileBody c={c} s={s} />}
            </div>
          </Dialog>
        )}
        {identityDialog}
      </>
    );
  }

  return (
    <main className="page page--sheet sheet">
      <div className="toprow">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link to="/">Library</Link><span aria-hidden="true">/</span><span aria-current="page">{c.name}</span>
        </nav>
        <div className="legend">
          <span className="legend__item"><span className="legend__swatch" aria-hidden="true" />Editable</span>
          <span className="legend__item"><span className="legend__fx fx" aria-hidden="true">ƒ</span>Calculated</span>
          <SaveStatus />
        </div>
      </div>

      <CharacterHeader c={c} view="sheet" onEdit={() => setEditing(true)} />

      <div className="tiles">
        <section aria-labelledby="t-level" className="tile tile--level">
          <div className="tile__head">
            <h2 id="t-level" className="overline">Level</h2>
            <span className="tile__aside">{toNext == null ? 'Max level' : `Next: Level ${next}`}</span>
          </div>
          <LevelTileBody c={c} s={s} />
        </section>
        <section aria-labelledby="t-ess" className="tile tile--essence">
          <div className="tile__head">
            <h2 id="t-ess" className="overline">Available Essence</h2>
            <EssenceIcon />
          </div>
          <EssenceTileBody c={c} s={s} />
        </section>
        <section aria-labelledby="t-rep" className="tile tile--reputation">
          <div className="tile__head">
            <h2 id="t-rep" className="overline">Reputation</h2>
            <span className="tile__aside">{progress}% toward Rank {rank + 1}</span>
          </div>
          <ReputationTileBody c={c} s={s} />
        </section>
      </div>

      <div className="sheet__cols">
        <div className="sheet__col sheet__col--res">
          <ResourcesPanel c={c} s={s} />
        </div>
        <div className="sheet__col sheet__col--attr">
          <AttributesPanel c={c} s={s} />
          <PointsPanel c={c} s={s} />
        </div>
      </div>
      {identityDialog}
    </main>
  );
}
