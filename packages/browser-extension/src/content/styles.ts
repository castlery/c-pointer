export const fortressCss = `
  :host {
    --fortress-primary: #D25C1B;
    --fortress-primary-dark: #A44714;
    --fortress-ink: #3C101E;
    --fortress-muted: #A59198;
    --fortress-line: #BEBEBE;
    --fortress-surface: #FBF9F4;
    --fortress-surface-muted: #F4EDE8;
    --fortress-surface-elevated: rgba(255, 255, 255, 0.94);
    --fortress-error: #65000B;
    --fortress-font-heading: "Aime", "Iowan Old Style", "Palatino Linotype", serif;
    --fortress-font-body: "Aime", "Georgia", "Times New Roman", serif;
  }

  * {
    box-sizing: border-box;
  }

  :host,
  button,
  input,
  textarea {
    font-family: var(--fortress-font-body);
  }

  button:hover {
    filter: brightness(0.98);
  }

  button:active {
    transform: translateY(1px);
  }

  input::placeholder {
    color: var(--fortress-muted);
  }

  textarea::placeholder {
    color: var(--fortress-muted);
  }
`;
