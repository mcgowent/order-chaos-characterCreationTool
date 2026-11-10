import { useStore } from '../store/store';
import { CheckIcon } from './Icons';
import './SaveStatus.css';

export function SaveStatus({ compact = false }: { compact?: boolean }) {
  const { saveStatus } = useStore();
  if (saveStatus === 'unavailable') {
    return (
      <span className="save-status save-status--warn" role="status">
        {compact ? 'Not saved' : 'Changes are not being saved in this browser'}
      </span>
    );
  }
  if (saveStatus === 'saving') {
    return <span className="save-status save-status--pending" role="status">Saving…</span>;
  }
  return (
    <span className="save-status save-status--ok" role="status">
      {!compact && <CheckIcon />}
      {compact ? 'Saved' : 'All changes saved'}
    </span>
  );
}
