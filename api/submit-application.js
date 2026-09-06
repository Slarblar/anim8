const ASANA_PROJECT_GID   = '1213548438306670';
const ASANA_SECTION_GID   = '1213548438306671'; // New Candidates
const ASANA_WORKSPACE_GID = '1210991035370090';
const ASANA_BASE          = 'https://app.asana.com/api/1.0';

// ── Custom field GIDs ────────────────────────────────────────────────────────
const CF_ROLE          = '1213548447605501';
const CF_POSITION_TYPE = '1213548453655352';
const CF_PORTFOLIO     = '1213548447450214';
const CF_CV            = '1213637269318806';
const CF_EMAIL         = '1213752796441066';
const CF_PHONE         = '1213752796441070';

// ── Role enum option GIDs ────────────────────────────────────────────────────
const roleEnumGid = {
  animator:     '1213548447605502', // Animator
  conceptArtist:'1213548447605503', // Concept / Storyboard
  modeler:      '1213548447605504', // Modeler
  designer:     '1213548447605505', // Designer
  designIntern: '1213548447605505', // Designer (closest match)
  videoEditor:  '1213548447605511', // Editor
  other:        '1218211404679399', // Other
};

// ── Position type enum option GIDs ───────────────────────────────────────────
const positionTypeEnumGid = {
  fulltime: '1213548447605488', // Full-time
  parttime: '1213548447605489', // Part-time
  contract: '1213548447605490', // Contract
};

// ── Interview Status field ───────────────────────────────────────────────────
const CF_INTERVIEW_STATUS = '1213548453655330';
const CF_INTERVIEW_STATUS_NEW = '1213749826605616'; // New

// ── Software → tag name map ──────────────────────────────────────────────────
const softwareTagMap = {
  'Maya':              'maya',
  'Blender':           'blender',
  'ZBrush':            'zbrush',
  'Substance Painter': 'substance-painter',
  'Marvelous Designer':'marvelous-designer',
  'Houdini':           'houdini',
  'Cinema 4D':         'cinema-4d',
  'Unreal Engine':     'unreal-engine',
  'Unity':             'unity',
  'Figma':             'figma',
  'Illustrator':       'illustrator',
  'Photoshop':         'photoshop',
  'InDesign':          'indesign',
  'Procreate':         'procreate',
  'Clip Studio':       'clip-studio',
  'After Effects':     'after-effects',
  'Premiere':          'premiere',
  'DaVinci Resolve':   'davinci-resolve',
  'Nuke':              'nuke',
  'Google Suite':      'google-suite',
  'Meta Ads':          'meta-ads',
  'Influencer Marketing': 'influencer-marketing',
  'Social Media':      'social-media',
};

const roleTagMap = {
  designer:     'designer',
  designIntern: 'design-intern',
  conceptArtist:'concept-artist',
  videoEditor:  'video-editor',
  modeler:      '3d-modeler',
  animator:     'animator',
  other:        'other',
};

const roleLabels = {
  designer:     'Designer',
  designIntern: 'Design Intern',
  conceptArtist:'Storyboard & Concept Artist',
  videoEditor:  'Video Editor / VFX Artist',
  modeler:      '3D Modeler / Generalist',
  animator:     'Senior Animator',
  other:        'Other',
};

function resolveRoleLabel(role, otherRole) {
  const custom = typeof otherRole === 'string' ? otherRole.trim() : '';
  if (role === 'other') return custom ? `Other — ${custom}` : 'Other';
  return roleLabels[role] || role;
}

const questionNoteLabels = {
  goal: 'What they want to do here',
  proudWork: 'Project they are proud of',
  growth: 'Where they want to grow',
  tools: 'Tools',
  toolsOther: 'Other tools',
};

function formatKey(key) {
  return questionNoteLabels[key] || key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

function buildNotes(role, otherRole, basics, roleQuestions, universalQuestions) {
  const lines = [
    `ROLE: ${resolveRoleLabel(role, otherRole)}`,
    `POSITION TYPE: ${basics.positionType || '—'}`,
    `EMAIL: ${basics.email}`,
    `PORTFOLIO: ${basics.portfolio}`,
    `CV / RESUME: ${basics.cv}`,
    `OTHER LINKS: ${basics.otherLinks || '—'}`,
  ];

  const questionLines = [];
  if (roleQuestions && typeof roleQuestions === 'object') {
    for (const [key, value] of Object.entries(roleQuestions)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;

      const label = formatKey(key);
      if (Array.isArray(value)) {
        questionLines.push(`${label}: ${value.join(', ')}`);
      } else if (typeof value === 'boolean') {
        questionLines.push(`${label}: ${value ? 'Yes' : 'No'}`);
      } else if (role === 'other') {
        questionLines.push(`${label}:\n${value}`);
      } else {
        questionLines.push(`${label}: ${value}`);
      }
    }
  }

  if (questionLines.length) {
    const heading = role === 'other' ? '── GOALS ──' : '── ROLE QUESTIONS ──';
    lines.push('', heading, ...questionLines);
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
    body: JSON.stringify({ data: { name, workspace: ASANA_WORKSPACE_GID } }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Failed to create tag "${name}": ${e?.errors?.[0]?.message || res.status}`);
  }
  const json = await res.json();
  return json.data.gid;
}

async function applyTags(taskGid, tagNames, authHeaders) {
  if (tagNames.length === 0) return;
  const tagsRes = await fetch(
    `${ASANA_BASE}/workspaces/${ASANA_WORKSPACE_GID}/tags?opt_fields=name,gid&limit=100`,
    { headers: authHeaders }
  );
  const tagsJson = tagsRes.ok ? await tagsRes.json() : { data: [] };
  const existingMap = Object.fromEntries((tagsJson.data || []).map(t => [t.name, t.gid]));
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
        console.error(`Tag skipped for "${name}":`, err.message);
      }
    })
  );
}

function buildCustomFields(role, basics) {
  const fields = {};

  // Enum fields take the option GID directly as a string
  if (roleEnumGid[role]) {
    fields[CF_ROLE] = roleEnumGid[role];
  }

  const ptKey = (basics.positionType || '').toLowerCase().replace(/-/g, '');
  if (positionTypeEnumGid[ptKey]) {
    fields[CF_POSITION_TYPE] = positionTypeEnumGid[ptKey];
  }

  // Interview Status → default to "New"
  if (CF_INTERVIEW_STATUS_NEW !== 'PENDING') {
    fields[CF_INTERVIEW_STATUS] = CF_INTERVIEW_STATUS_NEW;
  }

  // Text fields
  if (basics.portfolio) fields[CF_PORTFOLIO] = basics.portfolio;
  if (basics.cv)        fields[CF_CV]        = basics.cv;
  if (basics.email)     fields[CF_EMAIL]     = basics.email;
  if (basics.phone)     fields[CF_PHONE]     = basics.phone;

  return fields;
}

export default async function handler(req, res) {
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

  const { role, otherRole, basics, roleQuestions, universalQuestions } = req.body || {};

  if (!role || !basics || !universalQuestions) {
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }

  const customRole = typeof otherRole === 'string' ? otherRole.trim() : '';
  if (role === 'other' && !customRole) {
    return res.status(400).json({ success: false, error: 'Please specify the role' });
  }

  const roleLabel    = resolveRoleLabel(role, customRole);
  const taskName     = `${basics.name} — ${roleLabel}`;
  const notes        = buildNotes(role, customRole, basics, roleQuestions, universalQuestions);
  const customFields = buildCustomFields(role, basics);

  // ── 1. Create task with custom fields ────────────────────────────────────
  let taskGid;
  try {
    const taskRes = await fetch(`${ASANA_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        data: {
          name: taskName,
          notes,
          projects:      [ASANA_PROJECT_GID],
          workspace:     ASANA_WORKSPACE_GID,
          custom_fields: customFields,
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

  // ── 3. Apply tags (non-fatal) ────────────────────────────────────────────
  try {
    const tagNames = collectTagNames(role, roleQuestions);
    await applyTags(taskGid, tagNames, authHeaders);
  } catch (err) {
    console.error('Tag application error:', err.message);
  }

  return res.status(200).json({ success: true, taskId: taskGid });
}
