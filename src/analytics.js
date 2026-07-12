import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let ready = false;

export function initAnalytics() {
  if (ready || !KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    autocapture: false,
    person_profiles: 'identified_only',
  });
  ready = true;
}

export function track(event, props) {
  if (!ready) return;
  posthog.capture(event, props);
}

export function identifyUser(user, extra) {
  if (!ready || !user) return;
  posthog.identify(user.id, { email: user.email, ...extra });
}

export function setPersonProps(props) {
  if (!ready) return;
  posthog.setPersonProperties(props);
}

export function resetAnalytics() {
  if (!ready) return;
  posthog.reset();
}
