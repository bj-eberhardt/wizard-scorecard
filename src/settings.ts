/** Runtime settings. These are intentionally in-memory for now; persistence can be added later. */
export interface AppSettings {
  showDialogIntroAnimation: boolean;
  hideWinningShareImage: boolean;
}

const query = new URLSearchParams(window.location.search);

const queryDisables = (name: string) =>
  query.has(
    name.startsWith('show')
      ? `hide${name.slice(4)}`
      : `hide${name[0].toUpperCase()}${name.slice(1)}`
  ) ||
  query.get(name) === '0' ||
  query.get(name) === 'false';

export const appSettings: Readonly<AppSettings> = {
  showDialogIntroAnimation: !queryDisables('showDialogIntroAnimation'),
  hideWinningShareImage: query.has('hideWinningShareImage') || query.has('hideSaveImage'),
};
