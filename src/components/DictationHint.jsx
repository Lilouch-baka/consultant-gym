import { useApp } from '../state.jsx';
import Icon from './Icon.jsx';

// One-time tip shown above the first long-answer box until dismissed.
export default function DictationHint() {
  const { settings, updateSettings } = useApp();
  if (settings.hintsSeen?.dictation) return null;
  return (
    <div className="hint-card" role="note">
      <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
        <Icon name="mic" size={18} stroke={2} />
      </span>
      <span style={{ flex: 1 }}>
        Long answers are faster spoken: tap the <b>microphone</b> on the iPhone keyboard to dictate, then tidy up the text.
      </span>
      <button className="btn sm" onClick={() => updateSettings({ hintsSeen: { ...settings.hintsSeen, dictation: true } })}>
        Got it
      </button>
    </div>
  );
}
