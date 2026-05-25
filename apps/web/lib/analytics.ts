/**
 * Google Analytics 4 初期化
 *
 * .env で PUBLIC_ENV__GOOGLE_ANALYTICS に GA ID を設定してください
 * 例: PUBLIC_ENV__GOOGLE_ANALYTICS=G-XXXXXXXXXX
 */

import ReactGA from 'react-ga4';

export function initializeGA() {
  const gaId = import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS;

  if (!gaId) {
    console.warn('Google Analytics ID (PUBLIC_ENV__GOOGLE_ANALYTICS) is not configured');
    return;
  }

  try {
    ReactGA.initialize(gaId);
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
}

export function trackPageView(path: string) {
  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    ReactGA.event(eventName, eventParams);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}
