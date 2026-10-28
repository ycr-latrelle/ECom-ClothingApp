import { AVATAR_COLORS, AVATAR_SYMBOLS } from './avatarOptions.js';

// Pick the avatar colour and symbol. Changes apply straight away to the avatar
// above this panel, so there is no Save button.
export default function AvatarCustomizer({ id, prefs, initial, onChange, onReset, onDone }) {
  return (
    <section id={id} className="avatar-customizer" aria-label="Customize your avatar">
      <fieldset className="account-fieldset">
        <legend>Color</legend>
        <div className="avatar-options">
          {AVATAR_COLORS.map((option) => (
            <label key={option.id} className="avatar-option">
              <input
                type="radio"
                name="avatar-color"
                value={option.id}
                checked={prefs.avatarColor === option.id}
                onChange={() => onChange({ avatarColor: option.id })}
              />
              <span className="avatar-swatch" style={{ '--swatch': option.value }} aria-hidden="true" />
              <span className="account-sr">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="account-fieldset">
        <legend>Symbol</legend>
        <div className="avatar-options">
          {AVATAR_SYMBOLS.map((option) => (
            <label key={option.id} className="avatar-option">
              <input
                type="radio"
                name="avatar-symbol"
                value={option.id}
                checked={prefs.avatarSymbol === option.id}
                onChange={() => onChange({ avatarSymbol: option.id })}
              />
              <span className="avatar-swatch is-symbol" aria-hidden="true">
                {option.char ?? initial}
              </span>
              <span className="account-sr">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="account-hint">Saved on this device only.</p>

      <div className="profile-form-actions">
        <button type="button" className="account-button is-small" onClick={onDone}>Done</button>
        <button type="button" className="account-button is-small is-outline" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
