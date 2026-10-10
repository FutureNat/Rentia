import type { useClerk } from '@clerk/nextjs';

type ProfileOptions = NonNullable<Parameters<ReturnType<typeof useClerk>['openUserProfile']>[0]>;

// Reuse the provider's verification, reauthentication and session flows.
// These overrides affect only account settings, not registration or sign-in.
export const accountAppearance: ProfileOptions['appearance'] = {
  variables: {
    colorPrimary: '#21d4c2', colorPrimaryForeground: '#05201d',
    colorBackground: '#0b1826', colorForeground: '#f4f8fb',
    colorMuted: '#102232', colorMutedForeground: '#9bb0c3',
    colorNeutral: '#f4f8fb', colorInput: '#08131f',
    colorInputForeground: '#f4f8fb', colorRing: '#21d4c2',
    colorDanger: '#ff758c', borderRadius: '0.8rem',
    fontFamily: 'var(--font-geist-sans), Arial, sans-serif', fontSize: '1rem',
  },
  elements: {
    modalBackdrop: { backgroundColor: '#020914b8', backdropFilter: 'blur(5px)' },
    modalContent: 'rentiaAccountModal',
    cardBox: { border: '1px solid #294357', boxShadow: '0 24px 90px #0008' },
    navbar: { background: '#081522', borderRight: '1px solid #203649' },
    navbarButton: { borderRadius: '10px' },
    pageScrollBox: { background: '#0b1826' },
    profileSection: { borderColor: '#203649' },
    formFieldInput: { border: '1px solid #294357' },
    badge: { background: '#153934', color: '#8ce4cf' },
    // Deleting an identity is not closing its store. A dedicated ownership
    // and data-retention flow must exist before exposing that action.
    profileSection__danger: { display: 'none' },
  },
};
