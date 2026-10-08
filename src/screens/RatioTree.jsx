import { useMemo, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { TREES, findPath } from '../finance/trees.js';
import { applyScenario, buildStatements, computeRatios, isBaseScenario, NO_SCENARIO } from '../finance/model.js';
import { BackButton, SectionLabel } from '../components/ui.jsx';

const EPS = 1e-9;

function direction(node, base, now) {
  const b = node.value(base);
  const n = node.value(now);
  if (Math.abs(n - b) < 1e-6 * Math.max(1, Math.abs(b))) return null;
  return n > b ? 'up' : 'down';
}

// Colour a change green if it is good for returns, red if bad (neutral for leverage nodes).
function tone(node, dir) {
  if (!dir || node.higherIsBetter === null || node.higherIsBetter === undefined) return '';
  const good = (dir === 'up') === node.higherIsBetter;
  return good ? 'up' : 'down';
}

function Node({ node, level, base, now, selected, onSelect }) {
  const dir = direction(node, base, now);
  const t = tone(node, dir);
  return (
    <button
      className={`node l${level} ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={`${node.label} ${node.fmt(node.value(now))}${dir ? `, was ${node.fmt(node.value(base))}` : ''}`}
    >
      <span style={{ fontWeight: level < 2 ? 600 : 400 }}>{node.label}</span>
      <span className="nv">{node.fmt(node.value(now))}</span>
      {dir && (
        <span className={`nd ${t}`}>
          {dir === 'up' ? '↑' : '↓'} from {node.fmt(node.value(base))}
        </span>
      )}
    </button>
  );
}

export default function RatioTree({ params }) {
  const { settings } = useApp();
  const [treeId, setTreeId] = useState(params.tree === 'roic' ? 'roic' : 'dupont');
  const [scenarios, setScenarios] = useState({ dupont: { ...NO_SCENARIO }, roic: { ...NO_SCENARIO } });
  const [selectedId, setSelectedId] = useState(treeId === 'roic' ? 'r_dso' : 'dso');
  const tree = TREES[treeId];
  const scenario = scenarios[treeId];

  const base = useMemo(() => computeRatios(buildStatements(settings.company)), [settings.company]);
  const now = useMemo(() => computeRatios(applyScenario(settings.company, scenario)), [settings.company, scenario]);

  const path = findPath(tree, selectedId) || [tree];
  const node = path[path.length - 1];
  const cols = tree.children.length;

  function setSlider(key, v) {
    setScenarios((s) => ({ ...s, [treeId]: { ...s[treeId], [key]: v } }));
  }

  function switchTree(id) {
    setTreeId(id);
    setSelectedId(id === 'roic' ? 'r_dso' : 'dso');
  }

  const changed = !isBaseScenario(scenario);
  const rootFormula =
    treeId === 'dupont'
      ? `${tree.fmt(now.roe)} = ${(now.netMargin * 100).toFixed(1)}% × ${now.assetTurnover.toFixed(2)} × ${now.equityMultiplier.toFixed(2)}`
      : `${tree.fmt(now.roic)} = ${(now.nopatMargin * 100).toFixed(1)}% × ${now.icTurnover.toFixed(2)}`;

  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <div className="row">
        <BackButton to="/layers" />
        <div className="stack" style={{ gap: 2 }}>
          <div className="eyebrow">L3 · Interactions</div>
          <h1 className="title" style={{ fontSize: 26 }}>
            Ratio tree
          </h1>
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Choose tree">
        <button aria-pressed={treeId === 'dupont'} onClick={() => switchTree('dupont')}>
          DuPont (ROE)
        </button>
        <button aria-pressed={treeId === 'roic'} onClick={() => switchTree('roic')}>
          ROIC tree
        </button>
      </div>

      <div className="mono" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>
        {treeId === 'dupont' ? 'ROE = Net margin × Asset turnover × Equity multiplier' : 'ROIC = NOPAT margin × IC turnover'}
        <br />
        <span style={{ color: 'var(--muted)' }}>{rootFormula}</span>
      </div>

      <div className="tree">
        <div className="tree-root">
          <Node node={tree} level={0} base={base} now={now} selected={selectedId === tree.id} onSelect={setSelectedId} />
        </div>
        <div className="tree-stem" />
        <div className="tree-l1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          <div className="hbar" style={{ left: `calc(${100 / (2 * cols)}% - 1px)`, right: `calc(${100 / (2 * cols)}% - 1px)` }} />
          {tree.children.map((c) => (
            <div className="tree-col" key={c.id}>
              <Node node={c} level={1} base={base} now={now} selected={selectedId === c.id} onSelect={setSelectedId} />
              <div className="leaves">
                {c.children.map((leaf) => (
                  <div className="leaf-wrap" key={leaf.id}>
                    <Node node={leaf} level={2} base={base} now={now} selected={selectedId === leaf.id} onSelect={setSelectedId} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {changed && (
        <div className="row-between" style={{ alignItems: 'center' }}>
          <div className="caption">What-if active: change shown against base</div>
          <button className="btn sm" onClick={() => setScenarios((s) => ({ ...s, [treeId]: { ...NO_SCENARIO } }))}>
            Reset
          </button>
        </div>
      )}

      <NodeCard key={node.id} tree={tree} node={node} path={path} base={base} now={now} scenario={scenario} setSlider={setSlider} company={settings.company} />

      <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Sample company: {settings.company.name} ({settings.company.currency}). Every value is computed from one set of statements; edit them in Settings. What-ifs
        hold revenue and equity constant and fund any change in capital with debt.
      </div>
    </div>
  );
}

function NodeCard({ tree, node, path, base, now, scenario, setSlider, company }) {
  const s = node.slider;
  const sliderUnit = s ? (s.unit === 'cur' ? ` ${company.currency}` : s.unit === 'pts' ? ' pts' : s.unit === 'days' ? ' days' : 'x') : '';
  const sliderVal = s ? scenario[s.key] : 0;
  // The selected node's path up to the root, then any other branch that also moved.
  const ripple = [...path].reverse();
  const onPath = new Set(path.map((n) => n.id));
  for (const c of tree.children) {
    if (!onPath.has(c.id) && Math.abs(c.value(now) - c.value(base)) > EPS) ripple.splice(ripple.length - 1, 0, c);
  }
  const anyChange = path.some((n) => Math.abs(n.value(now) - n.value(base)) > EPS);

  return (
    <div className="card accent-border" style={{ padding: 18, gap: 14 }}>
      <div className="row-between">
        <h2 className="h2">{node.label}</h2>
        <div className="mono caption" style={{ fontSize: 13 }}>
          {node.fmt(node.value(now))}
        </div>
      </div>
      <div className="formula">{node.formula}</div>
      <p className="body">{node.meaning}</p>

      <div className="stack" style={{ gap: 6 }}>
        <SectionLabel>Chain reaction</SectionLabel>
        <div className="chain">
          {node.chain.map((c, i) => (
            <div key={i}>{c}</div>
          ))}
        </div>
      </div>

      {s && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row-between">
            <label htmlFor={`slider-${node.id}`} className="section-label">
              What-if: {s.label}
            </label>
            <div className="mono" style={{ fontSize: 13 }}>
              {sliderVal > 0 && s.min < 0 ? '+' : ''}
              {sliderVal}
              {sliderUnit}
            </div>
          </div>
          <input
            id={`slider-${node.id}`}
            className="slider"
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={sliderVal}
            onChange={(e) => setSlider(s.key, Number(e.target.value))}
          />
          <div className="row-between caption mono" style={{ fontSize: 11 }}>
            <span>
              {s.min}
              {sliderUnit}
            </span>
            <span>
              {s.max > 0 && s.min < 0 ? '+' : ''}
              {s.max}
              {sliderUnit}
            </span>
          </div>
        </div>
      )}

      {anyChange && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Ripple up the tree</SectionLabel>
          <div className="ripple">
            {ripple.map((n) => {
              const b = n.value(base);
              const v = n.value(now);
              const d = Math.abs(v - b) > EPS ? (v > b ? 'up' : 'down') : null;
              const t = tone(n, d);
              return (
                <div className="r" key={n.id}>
                  <span>{n.label}</span>
                  <span className={t === 'up' ? 'up-txt' : t === 'down' ? 'down-txt' : ''}>
                    {n.fmt(b)} → {n.fmt(v)}
                  </span>
                </div>
              );
            })}
            <div className="r">
              <span>Net debt / EBITDA</span>
              <span>
                {base.netDebtToEbitda.toFixed(2)}x → {now.netDebtToEbitda.toFixed(2)}x
              </span>
            </div>
            <div className="r">
              <span>Interest cover</span>
              <span>
                {base.interestCover.toFixed(1)}x → {now.interestCover.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      )}

      <button className="btn lg primary" onClick={() => navigate('/session', { mode: 'topic', topic: node.topic })}>
        Quiz me on {node.label}
      </button>
    </div>
  );
}
