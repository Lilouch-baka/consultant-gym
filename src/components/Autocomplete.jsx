import { useState } from 'react';

// Text input with tap-to-fill suggestions underneath (iOS-friendly, no native datalist).
export default function Autocomplete({ id, label, value, onChange, getSuggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const items = open ? getSuggestions(value) : [];
  return (
    <div className="field" style={{ position: 'relative' }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input mono"
        style={{ fontSize: 15 }}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="sentences"
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={`${id}-list`}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {items.length > 0 && (
        <div id={`${id}-list`} role="listbox" className="suggest">
          {items.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
