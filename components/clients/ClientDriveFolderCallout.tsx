import {
  portalBody,
  portalBtnSecondary,
  portalCallout,
  portalLabel,
} from './portal-ui';

export function ClientDriveFolderCallout({ url }: { url: string }) {
  return (
    <div className={`${portalCallout} mt-6 min-[480px]:mt-8`}>
      <p className={portalLabel}>Your upload folder</p>
      <p className={`${portalBody} mt-2 text-white/90`}>
        Drop files here anytime — especially anything over 50 MB. Open the folder, upload, then come
        back and submit.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${portalBtnSecondary} mt-4`}
      >
        Open Drive folder
      </a>
    </div>
  );
}
