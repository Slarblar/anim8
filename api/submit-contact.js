const ASANA_PROJECT_GID   = '1213795486452930'; // Anim-8 CMS
const ASANA_SECTION_GID   = '1213795486488635'; // 📥 New Submissions
const ASANA_BASE          = 'https://app.asana.com/api/1.0';

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

  const { name, company, email, phone, projectType, message } = req.body || {};

  if (!name || !company || !email || !projectType || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const authHeaders = {
    Authorization:  `Bearer ${PAT}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };

  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const notes = [
    `CONTACT FORM SUBMISSION`,
    `──────────────────────────`,
    `Name:         ${name}`,
    `Company:      ${company}`,
    `Email:        ${email}`,
    phone ? `Phone:        ${phone}` : null,
    `Project Type: ${projectType}`,
    ``,
    `Message:`,
    message,
    ``,
    `──────────────────────────`,
    `Submitted:    ${submittedAt}`,
    `Source:       anim-8.xyz/contact`,
  ].filter(l => l !== null).join('\n');

  const taskName = `${name} — ${company} (${projectType})`;

  // ── 1. Create task ────────────────────────────────────────────────────────
  let taskGid;
  try {
    const taskRes = await fetch(`${ASANA_BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        data: {
          name: taskName,
          notes,
          projects: [ASANA_PROJECT_GID],
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

  // ── 2. Place in "New Submissions" section (non-fatal) ─────────────────────
  try {
    await fetch(`${ASANA_BASE}/sections/${ASANA_SECTION_GID}/addTask`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ data: { task: taskGid } }),
    });
  } catch (err) {
    console.error('Section placement error:', err.message);
  }

  return res.status(200).json({ success: true, taskId: taskGid });
}
