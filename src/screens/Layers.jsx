import { useMemo } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { LAYERS, LAYER_BY_ID } from '../data/curriculum.js';
import { computeStats, pct } from '../engine/stats.js';
import { BackButton, ProgressBar, ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

export function Layers() {
  const { questions, reviews } = useApp();
  const stats = useMemo(() => computeStats(questions, reviews), [questions, reviews]);
  return (
    <div className="screen with-tabs">
      <ScreenHeader eyebrow={`${questions.length} questions`} title="Layers" />

      <button className="row-card" onClick={() => navigate('/tree')} style={{ borderColor: 'var(--accent)' }}>
        <span style={{ color: 'var(--accent)' }}>
          <Icon name="tree" />
        </span>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Ratio tree</div>
          <div className="caption" style={{ fontSize: 12 }}>
            DuPont and ROIC trees with live what-if sliders
          </div>
        </div>
        <Icon name="chevron" size={18} />
      </button>

      {LAYERS.map((l) => {
        const count = questions.filter((q) => q.layer === l.id).length;
        return (
          <button key={l.id} className="row-card" onClick={() => navigate('/layer', { id: l.id })}>
            <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', width: 18 }}>
              {String(l.id).padStart(2, '0')}
            </div>
            <div className="stack" style={{ flex: 1, gap: 6 }}>
              <div className="row-between">
                <div style={{ fontSize: 15, fontWeight: 500 }}>{l.name}</div>
                <div className="caption" style={{ fontSize: 12 }}>
                  {l.topics.length} topics · {count} q
                </div>
              </div>
              <ProgressBar value={stats.layerMastery[l.id]} label={`${l.name} mastery`} />
            </div>
            <div className="mono" style={{ fontSize: 14, width: 40, textAlign: 'right' }}>
              {pct(stats.layerMastery[l.id])}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function LayerDetail({ params }) {
  const { questions, reviews } = useApp();
  const layer = LAYER_BY_ID[Number(params.id)] || LAYER_BY_ID[1];
  const stats = useMemo(() => computeStats(questions, reviews), [questions, reviews]);
  const inLayer = questions.filter((q) => q.layer === layer.id);

  return (
    <div className="screen with-tabs">
      <div className="row">
        <BackButton to="/layers" />
        <div className="eyebrow">Layer {layer.id}</div>
      </div>
      <ScreenHeader title={layer.name} />
      <div className="grid-2">
        <button className="btn lg primary" onClick={() => navigate('/session', { mode: 'layer', layer: layer.id })}>
          Drill this layer
        </button>
        <button className="btn lg" onClick={() => navigate('/session', { mode: 'hard', layer: layer.id })}>
          Hard only
        </button>
      </div>
      {layer.id === 3 && (
        <button className="btn lg outline-accent" onClick={() => navigate('/tree')}>
          <Icon name="tree" size={18} /> Open the ratio tree
        </button>
      )}
      <div className="stack">
        <div className="row-between">
          <h2 className="h2">Topics</h2>
          <div className="caption">mastery</div>
        </div>
        {layer.topics.map((t) => {
          const n = inLayer.filter((q) => q.topic === t.id).length;
          return (
            <div key={t.id} className="row-card" style={{ padding: '10px 10px 10px 14px' }}>
              <div className="stack" style={{ flex: 1, gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</div>
                <div className="row" style={{ gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={stats.topicMastery[t.id]} label={`${t.name} mastery`} />
                  </div>
                  <div className="caption mono" style={{ fontSize: 12 }}>
                    {pct(stats.topicMastery[t.id])} · {n}q
                  </div>
                </div>
              </div>
              <button className="btn sm primary" disabled={!n} onClick={() => navigate('/session', { mode: 'topic', topic: t.id })}>
                Drill
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
