const STEPS = ['Account', 'About you'];

// "1 Account — 2 About you" progress bar shown while registering.
export default function AccountSteps({ current }) {
  return (
    <ol className="account-steps" aria-label="Registration progress">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const state = number < current ? 'is-done' : number === current ? 'is-current' : '';

        return (
          <li
            key={label}
            className={state}
            aria-current={number === current ? 'step' : undefined}
          >
            <span className="account-step-num" aria-hidden="true">
              {number < current ? '✓' : number}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
