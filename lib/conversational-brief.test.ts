import { describe, expect, it } from 'vitest';
import {
  applyBriefPatch,
  canSubmitForTeamReview,
  createEmptyBrief,
  findBriefConflicts,
  productionReadiness,
  reconcileConflicts,
} from './conversational-brief';

function stated<T>(value: T) {
  return { value, provenance: 'client_statement' as const };
}

function mixedBrief() {
  return applyBriefPatch(
    createEmptyBrief('client-test'),
    {
      objective: stated('Launch a new campaign on Instagram.'),
      deliverables: [
        {
          action: 'add',
          title: stated('Instagram reels'),
          assetKind: 'video',
          quantity: stated(4),
          description: stated('20–30 second vertical reels'),
          variants: [
            {
              action: 'add',
              label: 'Vertical delivery',
              outputKind: 'video',
              format: stated('MP4'),
              specifications: {
                duration: stated('20–30 seconds'),
                aspectRatio: stated('9:16'),
              },
            },
          ],
        },
        {
          action: 'add',
          title: stated('Launch poster'),
          assetKind: 'social_graphic',
          quantity: stated(1),
          variants: [
            {
              action: 'add',
              label: 'PNG',
              outputKind: 'raster_image',
              format: stated('PNG'),
              specifications: {
                dimensions: stated('1080 × 1350 px'),
              },
            },
            {
              action: 'add',
              label: 'JPEG',
              outputKind: 'raster_image',
              format: stated('JPEG'),
              specifications: {
                dimensions: stated('1080 × 1350 px'),
              },
            },
          ],
        },
      ],
    },
    { sourceRef: 'message-1' }
  );
}

describe('conversational brief domain', () => {
  it('keeps four reels and one poster with two output variants separate', () => {
    const brief = mixedBrief();
    expect(brief.deliverables).toHaveLength(2);
    expect(brief.deliverables[0].quantity.value).toBe(4);
    expect(brief.deliverables[1].quantity.value).toBe(1);
    expect(brief.deliverables[1].variants.map((variant) => variant.format.value)).toEqual([
      'PNG',
      'JPEG',
    ]);
  });

  it('updates an existing quantity without changing unrelated deliverables', () => {
    const initial = mixedBrief();
    const reels = initial.deliverables[0];
    const poster = initial.deliverables[1];
    const next = applyBriefPatch(
      initial,
      {
        deliverables: [
          { action: 'update', targetId: reels.id, quantity: stated(6) },
        ],
      },
      { sourceRef: 'message-2', expectedVersion: initial.version }
    );
    expect(next.deliverables[0].quantity.value).toBe(6);
    expect(next.deliverables[1]).toEqual(poster);
  });

  it('applies an exact frame rate only to the requested video variant', () => {
    const initial = mixedBrief();
    const videoVariant = initial.deliverables[0].variants[0];
    const imageVariant = initial.deliverables[1].variants[0];
    const next = applyBriefPatch(
      initial,
      {
        deliverables: [
          {
            action: 'update',
            targetId: initial.deliverables[0].id,
            variants: [
              {
                action: 'update',
                targetId: videoVariant.id,
                specifications: { frameRate: stated('60 fps') },
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-3' }
    );
    expect(next.deliverables[0].variants[0].specifications.frameRate?.value).toBe('60 fps');
    expect(next.deliverables[1].variants.find((item) => item.id === imageVariant.id)?.specifications.frameRate).toBeUndefined();
  });

  it('does not infer frame rate from cinematic creative direction', () => {
    const initial = mixedBrief();
    const next = applyBriefPatch(
      initial,
      {
        deliverables: [
          {
            action: 'update',
            targetId: initial.deliverables[0].id,
            direction: stated('Cinematic and restrained'),
          },
        ],
      },
      { sourceRef: 'message-4' }
    );
    expect(next.deliverables[0].variants[0].specifications.frameRate).toBeUndefined();
  });

  it('never carries video-only settings onto a static output', () => {
    const initial = mixedBrief();
    const reel = initial.deliverables[0];
    const variant = reel.variants[0];
    const withFps = applyBriefPatch(
      initial,
      {
        deliverables: [
          {
            action: 'update',
            targetId: reel.id,
            variants: [
              {
                action: 'update',
                targetId: variant.id,
                specifications: {
                  frameRate: stated('23.976 fps'),
                  audio: stated('Stereo'),
                },
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-video' }
    );
    const changed = applyBriefPatch(
      withFps,
      {
        deliverables: [
          {
            action: 'update',
            targetId: reel.id,
            variants: [
              {
                action: 'update',
                targetId: variant.id,
                outputKind: 'raster_image',
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-static' }
    );
    expect(changed.deliverables[0].variants[0].specifications.frameRate).toBeUndefined();
    expect(changed.deliverables[0].variants[0].specifications.audio).toBeUndefined();
  });

  it('flags a transparent JPEG instead of silently changing it', () => {
    let brief = createEmptyBrief('client-test');
    brief = applyBriefPatch(
      brief,
      {
        deliverables: [
          {
            action: 'add',
            title: stated('Transparent logo'),
            assetKind: 'logo',
            quantity: stated(1),
            variants: [
              {
                action: 'add',
                label: 'JPEG',
                outputKind: 'raster_image',
                format: stated('JPEG'),
                specifications: { transparency: stated(true) },
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-1' }
    );
    expect(findBriefConflicts(brief)[0]?.description).toMatch(/does not support transparency/i);
    expect(reconcileConflicts(brief).openItems[0]?.impact).toBe('clarify_request');
  });

  it('supports editable SVG and transparent PNG as variants of one logo', () => {
    const brief = applyBriefPatch(
      createEmptyBrief('client-test'),
      {
        deliverables: [
          {
            action: 'add',
            title: stated('Primary logo'),
            assetKind: 'logo',
            quantity: stated(1),
            variants: [
              {
                action: 'add',
                label: 'Editable SVG',
                outputKind: 'vector',
                format: stated('SVG'),
                specifications: { editableFiles: stated(true) },
              },
              {
                action: 'add',
                label: 'Transparent PNG',
                outputKind: 'raster_image',
                format: stated('PNG'),
                specifications: { transparency: stated(true) },
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-1' }
    );
    expect(brief.deliverables).toHaveLength(1);
    expect(brief.deliverables[0].variants).toHaveLength(2);
  });

  it('keeps an uploaded PNG as a reference without creating a PNG output', () => {
    const brief = createEmptyBrief('client-test');
    brief.attachments.push({
      id: 'asset-png',
      name: 'reference.png',
      url: 'https://example.public.blob.vercel-storage.com/reference.png',
      role: 'reference',
      status: 'uploaded',
    });
    expect(brief.attachments[0].name).toBe('reference.png');
    expect(brief.deliverables).toHaveLength(0);
  });

  it('represents a GLB model and still render as distinct output variants', () => {
    const brief = applyBriefPatch(
      createEmptyBrief('client-test'),
      {
        deliverables: [
          {
            action: 'add',
            title: stated('Product model'),
            assetKind: '3d_asset',
            quantity: stated(1),
            variants: [
              {
                action: 'add',
                label: 'Interactive model',
                outputKind: 'model_3d',
                format: stated('GLB'),
              },
              {
                action: 'add',
                label: 'Hero still',
                outputKind: 'raster_image',
                format: stated('PNG'),
              },
            ],
          },
        ],
      },
      { sourceRef: 'message-3d' }
    );
    expect(brief.deliverables[0].variants.map((item) => item.outputKind)).toEqual([
      'model_3d',
      'raster_image',
    ]);
  });

  it('preserves physical print dimensions without inventing printer settings', () => {
    const brief = applyBriefPatch(
      createEmptyBrief('client-test'),
      {
        deliverables: [
          {
            action: 'add',
            title: stated('Event poster'),
            assetKind: 'print',
            quantity: stated(1),
            variants: [
              {
                action: 'add',
                label: 'Print PDF',
                outputKind: 'print',
                format: stated('PDF'),
                specifications: {
                  physicalDimensions: stated('24 × 36'),
                  units: stated('inches'),
                },
              },
            ],
          },
        ],
        openItems: [
          {
            description: 'Printer-specific bleed and color profile are still needed.',
            impact: 'before_production',
          },
        ],
      },
      { sourceRef: 'message-1' }
    );
    const specs = brief.deliverables[0].variants[0].specifications;
    expect(specs.physicalDimensions?.value).toBe('24 × 36');
    expect(specs.bleed).toBeUndefined();
    expect(brief.openItems[0].impact).toBe('before_production');
  });

  it('records a delegated team decision and allows team review', () => {
    const brief = applyBriefPatch(
      createEmptyBrief('client-test'),
      {
        objective: stated('Create a launch graphic.'),
        openItems: [
          {
            description: 'Choose the final raster format.',
            impact: 'team_decision',
            status: 'delegated',
            resolution: 'Client asked the team to choose.',
          },
        ],
      },
      { sourceRef: 'message-1' }
    );
    expect(canSubmitForTeamReview(brief)).toBe(true);
    expect(productionReadiness(brief).teamDecisions).toHaveLength(0);
    expect(brief.openItems[0].status).toBe('delegated');
  });

  it('rejects a stale update', () => {
    const brief = mixedBrief();
    expect(() =>
      applyBriefPatch(
        brief,
        { title: stated('Stale title') },
        { sourceRef: 'edit-1', expectedVersion: brief.version - 1 }
      )
    ).toThrow(/changed while/i);
  });
});
