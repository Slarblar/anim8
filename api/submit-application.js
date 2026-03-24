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

// ── Role enum option GIDs ────────────────────────────────────────────────────
const roleEnumGid = {
  animator:     '1213548447605502', // Animator
  conceptArtist:'1213548447605503', // Concept / Storyboard
  modeler:      '1213548447605504', // Modeler
  designer:     '1213548447605505', // Designer
  designIntern: '1213548447605505', // Designer (closest match)
  videoEditor:  '1213548447605511', // Editor
};

// ── Position type enum option GIDs ───────────────────────────────────────────
const positionTypeEnumGid = {
  fulltime: '1213548447605488', // Full-time
  parttime: '1213548447605489', // Part-time
  contract: '1213548447605490', // Contract
};

const roleLabels = {
  designer:     'Designer',
  designIntern: 'Design Intern',
  conceptArtist:'Storyboard & Concept Artist',
  videoEditor:  'Video Editor / VFX Artist',
  modeler:      '3D Modeler / Generalist',
  animator:     'Animator',
};

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

function buildCustomFields(role, basics) {
  const fields = {};

  // Role enum
  if (roleEnumGid[role]) {
    fields[CF_ROLE] = { gid: roleEnumGid[role] };
  }

  // Position type enum
  const ptKey = (basics.positionType || '').toLowerCase().replace('-', '');
  if (positionTypeEnumGid[ptKey]) {
    fields[CF_POSITION_TYPE] = { gid: positionTypeEnumGid[ptKey] };
  }

  // Text fields
  if (basics.portfolio) fields[CF_PORTFOLIO] = basics.portfolio;
  if (basics.cv)        fields[CF_CV]        = basics.cv;
  if (basics.email)     fields[CF_EMAIL]     = basics.email;

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

  const { role, basics, roleQuestions, universalQuestions } = req.body || {};

  if (!role || !basics || !universalQuestions) {
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }

  const taskName     = `${basics.name} — ${roleLabels[role] || role}`;
  const notes        = buildNotes(role, basics, roleQuestions, universalQuestions);
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

  // ── 2. Place in "New Candidates" section ─────────────────────────────────
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

  return res.status(200).json({ success: true, taskId: taskGid });
}
