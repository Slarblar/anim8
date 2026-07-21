'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { portalAlertSuccess, portalAlertWarning } from './portal-ui';

const AUTO_DISMISS_MS = 6_000;
const EXIT_MS = 420;

type PortalDismissibleAlertProps = {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  variant?: 'success' | 'warning';
  className?: string;
};

export function PortalDismissibleAlert({
  message,
  visible,
  onDismiss,
  variant = 'success',
  className = 'mt-8',
}: PortalDismissibleAlertProps) {
  const [mounted, setMounted] = useState(visible);
  const [exiting, setExiting] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissedRef.current = false;
      setMounted(true);
      setExiting(false);
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current || !mounted) return;
    dismissedRef.current = true;
    setExiting(true);

    window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
      onDismiss();
    }, EXIT_MS);
  }, [mounted, onDismiss]);

  useEffect(() => {
    if (!mounted || exiting || !visible) return;

    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, exiting, visible, dismiss, message]);

  if (!mounted) return null;

  const tone = variant === 'warning' ? portalAlertWarning : portalAlertSuccess;

  return (
    <button
      type="button"
      onClick={dismiss}
      className={`portal-dismissible-alert ${tone} ${className} block w-full cursor-pointer text-left transition hover:brightness-105 focus-lime ${
        exiting ? 'portal-dismissible-alert--exit' : 'portal-dismissible-alert--enter'
      }`}
      aria-live="polite"
      aria-label={`${message}. Click to dismiss.`}
    >
      {message}
    </button>
  );
}
