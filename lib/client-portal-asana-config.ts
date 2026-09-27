/** Client portal — ANIM-8 CLIENT INTAKE custom field GIDs (not secret). */

export const ANIM8_CALENDAR_URL =
  'https://calendar.app.google/4AfMaz1uEfPVW9r49';

/** "Design Clients" enum field — each option identifies one client's tasks. */
export const FIELD_DESIGN_CLIENTS = '1212054697251949';

export const INTAKE_PROJECT_GID = '1216732614798537';
export const INTAKE_SECTION_NEW_SUBMISSIONS = '1216734900877796';
export const INTAKE_SECTION_APPROVED = '1216732614798538';
export const INTAKE_SECTION_BLOCKED = '1216734900877800';
export const PRODUCTION_PIPELINE_GID = '1211367100593569';
export const DESIGN_PIPELINE_GID = '1212054441677535';

export const FIELD_PRIMARY_LINK = '1211366364979261';
export const FIELD_CLIENT_STATUS = '1216740243131238';
export const CLIENT_STATUS_NEW_SUBMISSION = '1216732614798564';
export const FIELD_TASK_TYPE = '1211831230938188';
export const TASK_TYPE_CLIENT_WORK = '1211831230938189';
export const FIELD_EFFORT = '1211831230938194';

/** Effort enum options on ANIM-8 CLIENT INTAKE. */
export const EFFORT_OPTION_GIDS = {
  S: '1211831230938195',
  M: '1211831230938196',
  L: '1211831230938197',
  XL: '1211831230938198',
  XXL: '1216816153363590',
} as const;

/**
 * Services Clients options, keyed by a compact client name (letters and digits only).
 * MISC is not created yet — leave the GID empty until it exists in Asana.
 * An empty GID means omit the field instead of failing the submission.
 */
export const SERVICES_CLIENT_MISC_GID = '';

export const SERVICES_CLIENT_GIDS: Record<string, string> = {
  anim8: '1212054697251950',
  saohouse: '1212054697251951',
  archaic: '1212054697251952',
  barbacoa: '1212054697251953',
  fresh: '1212054697251954',
  goodgoods: '1212054697251955',
  invitaheadspa: '1212054697251956',
  releafsociety: '1212054697251957',
  slcscoop: '1212054697251958',
  thealternative: '1212054697251959',
  insomniac: '1212411232824251',
  banmai: '1213391234929932',
  turnemsideways: '1216688707029422',
  jonahmoreno: '1217259353341671',
};
export const CLIENT_STATUS_IN_PROGRESS = '1216741576166629';
export const FIELD_BILLABLE_HOURS = '1216738674667157';
export const FIELD_COST_ESTIMATE = '1216741637481525';
/** Asana "Cost" — actual / invoiced amount vs the estimate. */
export const FIELD_FINAL_COST = '1212000405636255';
/** Status- on production / design pipeline projects. */
export const FIELD_PIPELINE_STATUS = '1211366366275944';
