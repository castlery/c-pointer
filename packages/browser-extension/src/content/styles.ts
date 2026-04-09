export const fortressCss = `
  :host {
    --fortress-primary: #D25C1B;
    --fortress-primary-dark: #A44714;
    --fortress-ink: #3C101E;
    --fortress-muted: #A59198;
    --fortress-line: #BEBEBE;
    --fortress-surface: #FBF9F4;
    --fortress-surface-muted: #F4EDE8;
    --fortress-error: #65000B;
    --fortress-font-heading: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
    --fortress-font-body: "Georgia", "Times New Roman", serif;
  }

  * {
    box-sizing: border-box;
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
`;
