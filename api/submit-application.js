const ASANA_PROJECT_GID   = '1213548438306670';
const ASANA_SECTION_GID   = '1213548438306671';
const ASANA_WORKSPACE_GID = '1210991035370090';
const ASANA_BASE          = 'https://app.asana.com/api/1.0';

const roleLabels = {
  designer:     'Designer',
  designIntern: 'Design Intern',
  conceptArtist:'Storyboard & Concept Artist',
  videoEditor:  'Video Editor / VFX Artist',
  modeler:      '3D Modeler / Generalist',
  animator:     'Animator',
};

const roleTagMap = {
  designer:     'designer',
  designIntern: 'design-intern',
  conceptArtist:'concept-artist',
  videoEditor:  'video-editor',
  modeler:      '3d-modeler',
  animator:     'animator',
};

const softwareTagMap = {
  'Maya':             'maya',
  'Blender':          'blender',
  'ZBrush':           'zbrush',
  'Substance Painter':'substance-painter',
  'Marvelous Designer':'marvelous-designer',
  'Houdini':          'houdini',
  'Cinema 4D':        'cinema-4d',
  'Unreal Engine':    'unreal-engine',
  'Unity':            'unity',
  'Figma':            'figma',
  'Illustrator':      'illustrator',
  'Photoshop':        'photoshop',
  'InDesign':         'indesign',
  'Procreate':        'procreate',
  'Clip Studio':      'clip-studio',
  'After Effects':    'after-effects',
  'Premiere':         'premiere',
  'DaVinci Resolve':  'davinci-resolve',
  'Nuke':             'nuke',
};

// Converts camelCase key to a readable label ("toolsOther" → "Tools Other")
function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

function buildNotes(role, basics, roleQuestions, universalQuestions) {
  const lines = [
    `ROLE: ${roleLabels[role] || role}`,
    `POSITION TYPE: ${basics.positionType || '—'}`,
    `EMAIL: ${basics.email}`,
    `PORTFOLIO: ${basics.portfolio}`,
    `CV / RESUME: ${basics.cv}`,
    `OTHER LINKS: ${basics.otherLinks || '—'}`,
    '',
    '── ROLE QUESTIONS ──',
  ];

  if (roleQuestions && typeof roleQuestions === 'object') {
    for (const [key, value] of Object.entries(roleQuestions)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;

      const label = formatKey(key);
      if (Array.isArray(value)) {
        lines.push(`${label}: ${value.join(', ')}`);
      } else if (typeof value === 'boolean') {
        lines.push(`${label}: ${value ? 'Yes' : 'No'}`);
      } else {
        lines.push(`${label}: ${value}`);
      }
    }
  }

  lines.push('', '── WHY ANIM-8 ──', universalQuestions.whyAnim8 || '');
  lines.push('', '── AVAILABILITY ──', universalQuestions.availability || '');

  return lines.join('\n');
}

function collectTagNames(role, roleQuestions) {
  const tags = new Set();

  if (roleTagMap[role]) tags.add(roleTagMap[role]);

  if (roleQuestions && typeof roleQuestions === 'object') {
    for (const value of Object.values(roleQuestions)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (softwareTagMap[item]) tags.add(softwareTagMap[item]);
        }
      }
    }
  }

  return [...tags];
}

async function getOrCreateTag(name, existingMap, authHeaders) {
  if (existingMap[name]) return existingMap[name];

  const res = await fetch(`${ASANA_BASE}/tags`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      data: { name, workspace: { gid: ASANA_WORKSPACE_GID } },
    }),
  });
  if (!res.ok) throw new Error(`Failed to create tag "${name}"`);
  const json = await res.json();
  return json.data.gid;
}

async function applyTags(taskGid, tagNames, authHeaders) {
  if (tagNames.length === 0) return;

  // Fetch all existing workspace tags in one request
  const tagsRes = await fetch(
    `${ASANA_BASE}/workspaces/${ASANA_WORKSPACE_GID}/tags?opt_fields=name,gid&limit=100`,
    { headers: authHeaders }
  );
  const tagsJson = tagsRes.ok ? await tagsRes.json() : { data: [] };
  const existingMap = Object.fromEntries(
    (tagsJson.data || []).map(t => [t.name, t.gid])
  );

  // Resolve all tags in parallel then apply them
  await Promise.all(
    tagNames.map(async (name) => {
      try {
        const tagGid = await getOrCreateTag(name, existingMap, authHeaders);
        await fetch(`${ASANA_BASE}/tasks/${taskGid}/addTag`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ data: { tag: tagGid } }),
        });
      } catch (err) {
        console.error(`Tag operation skipped for "${name}":`, err.message);
      }
    })
  );
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const PAT = process.env.ASANA_PAT;
  if (!PAT) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const authHeaders = {
    Authorization:  `Bearer ${PAT}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };

  const { role, basics, roleQuestions, universalQuestions } = req.body || {};

  if (!role || !basics || !universalQuestions) {
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }

  const taskName = `${basics.name} — ${roleLabels[role] || role}`;
  const notes    = buildNotes(role, basics, roleQuestions, universalQuestions);

  // ── 1. Create task ───────────────────────────────────────────────────────
  let taskGid;
  try {
    const taskRes = await fetch(`${ASANA_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        data: {
          name: taskName,
          notes,
          projects:  [ASANA_PROJECT_GID],
          workspace: ASANA_WORKSPACE_GID,
        },
      }),
    });

    if (!taskRes.ok) {
      const errJson = await taskRes.json().catch(() => ({}));
      const msg = errJson?.errors?.[0]?.message || `Asana API error (${taskRes.status})`;
      return res.status(502).json({ success: false, error: msg });
    }

    const taskJson = await taskRes.json();
    taskGid = taskJson.data.gid;
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }

  // ── 2. Place in "New Candidates" section (non-fatal) ─────────────────────
  try {
    const sectionRes = await fetch(
      `${ASANA_BASE}/sections/${ASANA_SECTION_GID}/addTask`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ data: { task: taskGid } }),
      }
    );
    if (!sectionRes.ok) {
      const e = await sectionRes.json().catch(() => ({}));
      console.error('Section placement failed:', e?.errors?.[0]?.message);
    }
  } catch (err) {
    console.error('Section placement error:', err.message);
  }

  // ── 3. Tags (non-fatal) ───────────────────────────────────────────────────
  try {
    const tagNames = collectTagNames(role, roleQuestions);
    await applyTags(taskGid, tagNames, authHeaders);
  } catch (err) {
    console.error('Tag application error:', err.message);
  }

  return res.status(200).json({ success: true, taskId: taskGid });
}
