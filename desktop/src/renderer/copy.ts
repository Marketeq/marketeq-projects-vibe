// src/renderer/copy.ts
//
// User-facing copy strings extracted from doc 41 (In-App Help, Empty States
// & Onboarding Copy). Keeping them centralized mirrors §10 of doc 41 —
// this is the seed of the eventual i18n bundle.

export const COPY = {
  app: {
    name: 'Time Tracker',
    tagline: 'Track your time, stay in sync, get paid.',
  },
  login: {
    heading: 'Sign In',
    emailLabel: 'Work Email',
    emailPlaceholder: 'you@company.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
    submit: 'Sign In',
    submitting: 'Verifying your account\u2026',
    forgot: 'Forgot Password?',
    helpText: 'Sign in with your Marketeq Projects account.',
    onboardingHint:
      'New to Time Tracker? Your manager can invite you. If you haven\u2019t received an invite, contact them directly.',
    errors: {
      invalidCredentials: 'Email or password is incorrect. Please try again.',
      network:
        'Unable to connect to our servers. Check your internet connection and try again.',
      locked: 'Too many sign-in attempts. Please try again later.',
      unknown: 'Something went wrong. Please try again.',
    },
  },
  onboarding: {
    welcome: {
      heading: 'Welcome to Time Tracker',
      subheading: 'Track your time, stay in sync, get paid.',
      description:
        'Time Tracker helps you log billable hours, capture activity, and keep disputes to a minimum. Set up takes about 2 minutes.',
      cta: "Let's Go",
    },
    privacy: {
      heading: 'Your Privacy',
      description:
        'Screenshots are encrypted and stored securely. Activity monitoring never captures keystrokes. You can review our full privacy policy anytime.',
      cta: 'I Understand',
    },
    screenRecording: {
      heading: 'Screen Recording Access',
      explanation:
        'To take periodic screenshots of your work, Time Tracker needs permission to record your screen. Screenshots are encrypted, stored securely, and never visible to anyone but you and your manager on demand.',
      grant: 'Grant Permission',
      deniedWarning:
        "Time Tracker won't be able to take screenshots. You can enable this in System Preferences > Security & Privacy > Screen Recording.",
      openSettings: 'Open System Settings',
      skip: 'Skip for Now',
    },
    accessibility: {
      heading: 'Accessibility Access',
      explanation:
        "To detect when you're actively working, Time Tracker monitors keyboard and mouse activity. No keystroke data is collected\u2014only activity timing.",
      grant: 'Grant Permission',
      deniedWarning:
        "Time Tracker will still work, but automatic idle detection won't function. You can enable this later.",
      skip: 'Skip for Now',
    },
    notifications: {
      heading: 'Notifications',
      explanation:
        "Get alerts when your sync is behind, when disputes arise, or when it's time to review your sessions.",
      grant: 'Enable Notifications',
      skip: 'Not Now',
    },
    done: {
      heading: "You're All Set",
      description:
        'Time Tracker is ready to go. Start your first session whenever you\u2019re ready.',
      cta: 'Open Time Tracker',
    },
  },
  main: {
    timerLabel: 'Elapsed Time',
    start: 'Start Session',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop Session',
    startBreakPaid: 'Paid Break',
    startBreakUnpaid: 'Unpaid Break',
    endBreak: 'End Break',
    emptyHeading: 'Ready to Get Started?',
    emptyBody: 'No sessions running. Start the timer when you begin work.',
    syncOnline: 'Synced',
    syncOffline: 'Offline',
    syncRunning: 'Syncing\u2026',
    recentScreenshots: 'Recent Screenshots',
    noScreenshots: 'No screenshots yet',
    today: 'Today',
    worked: 'Worked',
    onBreak: 'Break',
    activity: 'Activity',
  },
  idleModal: {
    heading: "You've been idle",
    body:
      "We detected you were away. What should we do with the idle time?",
    keep: 'Keep as Work',
    discard: 'Discard',
    convertBreak: 'Convert to Break',
  },
  locked: {
    heading: 'Session Locked',
    body: 'A dispute has been raised on your current session. Review before continuing.',
  },
} as const;
