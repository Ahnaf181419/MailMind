import type { RawThread } from '../providers/ingestion/IngestionProvider.js';

type Days = number;
type Hours = number;

const FACULTY = 'faculty.cse@aust.edu';
const CHAIR = 'chair.cse@aust.edu';
const DEAN = 'dean@aust.edu';
const CONTROLLER = 'controller.exams@aust.edu';
const REGISTRAR = 'registrar@aust.edu';
const STUDENT = 'tanvir.cse401@aust.edu';

function ago(days: Days = 0, hours: Hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function t(
  id: string,
  subject: string,
  participants: string[],
  messages: Array<{
    sender: string;
    senderIsFaculty: boolean;
    sentAt: string;
    body: string;
  }>,
): RawThread {
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  return {
    externalThreadId: id,
    subject,
    participants: Array.from(new Set(participants)),
    messages: sortedMessages,
    lastMessageAt: sortedMessages[sortedMessages.length - 1].sentAt,
  };
}

function fwd(iso: string, hoursLater: Hours = 1): string {
  return new Date(new Date(iso).getTime() + hoursLater * 3600_000).toISOString();
}

// Faculty standard short reply used in many threads
const FACULTY_REPLY_NOTED = 'Acknowledged. Will respond in detail by EOD.';
const FACULTY_REPLY_DONE = 'Done. Thanks for the heads-up.';
const FACULTY_REPLY_CONFIRM = 'Confirmed — section B informed. Thanks.';

export const SEED_THREADS: RawThread[] = [
  // ===== STUDENTS / RE-EVALUATION (URGENT, STALE 4d, UNREPLIED) =====
  t(
    'thr_001_reval_tanvir',
    'Re-evaluation request · CSE401 Mid Q3',
    [STUDENT, FACULTY],
    [
      {
        sender: STUDENT,
        senderIsFaculty: false,
        sentAt: ago(4, 2),
        body: 'Respected Sir, I hope this email finds you in good health. I am writing to request a re-evaluation of Q3(b) of the recent Midterm examination held on 25 August 2026. I believe partial credit was missed on the second-order analysis portion. Kind regards, Tanvir Ahmed, ID 2024-1-60-001.',
      },
    ],
  ),

  // ===== CLASSES (URGENT, TODAY, REPLIED) =====
  t(
    'thr_002_class_cse321_room_change',
    'CSE321 moved to Room 304 at 2 PM today',
    ['cse321.coord@aust.edu', FACULTY],
    [
      {
        sender: 'cse321.coord@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(0, 5),
        body: 'Respected faculty, due to a projector fault in Room 201, CSE321 (Section A) is moved to Room 304 at 2 PM today. Please inform your section. Thanks.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(0, 5), 1),
        body: `${FACULTY_REPLY_CONFIRM} Slides already updated.`,
      },
    ],
  ),

  // ===== EXAMINATIONS (URGENT, TODAY, REPLIED — sheet submitted) =====
  t(
    'thr_003_moderation_cse307',
    'Submit moderation sheet for CSE307 by 5 PM today',
    [CONTROLLER, FACULTY],
    [
      {
        sender: CONTROLLER,
        senderIsFaculty: false,
        sentAt: ago(0, 8),
        body: 'Respected Sir/Madam, please submit your moderation sheet for CSE307 Midterm by today 5 PM. The marks must reconcile with the chief examiner\'s tally. Thanks, Controller of Examinations.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(0, 8), 2),
        body: 'Sheet drafted; will submit by 4 PM. Will share the reconciliation file as well.',
      },
    ],
  ),

  // ===== CLASSES (URGENT, 28h, UNREPLIED) =====
  t(
    'thr_004_class_cancellation',
    'Confirm class cancellation for CSE407 (Section B)',
    ['head.cse@aust.edu', FACULTY],
    [
      {
        sender: 'head.cse@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(1, 4),
        body: 'Respected Sir, please confirm cancellation of CSE407 (Section B) today due to the department event. We need to notify Section B students.',
      },
    ],
  ),

  // ===== STUDENTS (20h, UNREPLIED) =====
  t(
    'thr_005_attendance_rafi',
    'Class attendance query — make-up eligibility',
    ['rafi.cse401@aust.edu', FACULTY],
    [
      {
        sender: 'rafi.cse401@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(0, 20),
        body: 'Respected Sir, I have missed 3 labs in CSE401 due to medical reasons. Could you please confirm whether I am eligible for the make-up lab? Regards, Rafi Hassan.',
      },
    ],
  ),

  // ===== STUDENTS (ROUTINE, RECENT 6h, REPLIED) =====
  t(
    'thr_006_extension_nusrat',
    'Project extension request — CSE321 Phase 2',
    ['nusrat.cse401@aust.edu', FACULTY],
    [
      {
        sender: 'nusrat.cse401@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(0, 6),
        body: 'Respected Sir, I am requesting a 2-day extension on the CSE321 Phase 2 submission due to overlapping deadlines. Could you kindly consider? Thanks, Nusrat Jahan.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(0, 6), 2),
        body: 'Approved — new deadline Wednesday 11:59 PM. Please email your team.',
      },
    ],
  ),

  // ===== MEETINGS (ROUTINE, RECENT 1d, REPLIED) =====
  t(
    'thr_007_bos_meeting',
    'BOS meeting minutes — CSE curriculum revision',
    [CHAIR, FACULTY],
    [
      {
        sender: CHAIR,
        senderIsFaculty: false,
        sentAt: ago(1, 2),
        body: 'Respected members, please find attached the draft minutes of the Board of Studies meeting on 2 Sep 2026. Kindly review the curriculum revision item (CSE4xx electives) and respond by Wednesday. Thanks, Chair CSE.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 2), 4),
        body: 'Reviewed. Comments on the CSE4xx list attached separately.',
      },
    ],
  ),

  // ===== MEETINGS (STALE 5d, UNREPLIED) =====
  t(
    'thr_008_dept_meeting_minutes',
    'Department meeting minutes — 1 Sep 2026',
    [CHAIR, FACULTY],
    [
      {
        sender: CHAIR,
        senderIsFaculty: false,
        sentAt: ago(5, 4),
        body: 'Respected faculty, attached are the minutes of the department meeting held on 1 Sep 2026. Please acknowledge receipt and confirm the action items assigned to you.',
      },
    ],
  ),

  // ===== MEETINGS (RECENT 1d, REPLIED) =====
  t(
    'thr_009_committee_undergrad',
    'Undergraduate committee — course allocation',
    ['undergrad.committee@aust.edu', FACULTY],
    [
      {
        sender: 'undergrad.committee@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(1, 5),
        body: 'Dear faculty, please confirm your course allocation preferences for Spring 2027 by Friday. The committee will meet next Monday to finalise the timetable.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 5), 3),
        body: 'Submitted: CSE321 (theory) + CSE307 (theory). Open for lab allocation.',
      },
    ],
  ),

  // ===== MEETINGS (ROUTINE 30h, UNREPLIED) =====
  t(
    'thr_010_external_ieee',
    'IEEE Bangladesh Section — chapter meeting invitation',
    ['chair.ieee.bd@ieee.org', FACULTY],
    [
      {
        sender: 'chair.ieee.bd@ieee.org',
        senderIsFaculty: false,
        sentAt: ago(1, 6),
        body: 'Dear Dr., we are pleased to invite you to the IEEE BDS Chapter meeting on 12 Sep 2026 at BUET. RSVP by 10 Sep.',
      },
    ],
  ),

  // ===== CLASSES (ROUTINE 1d, REPLIED) =====
  t(
    'thr_011_lab_reschedule',
    'CSE307 lab reschedule — Section B',
    ['cse307.coord@aust.edu', FACULTY],
    [
      {
        sender: 'cse307.coord@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(1, 8),
        body: 'Respected Sir, the CSE307 lab for Section B on Thursday has been rescheduled to Friday 3 PM due to TA availability. Please confirm.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 8), 2),
        body: 'Confirmed — Section B informed.',
      },
    ],
  ),

  // ===== CLASSES (ROUTINE 2d, REPLIED) =====
  t(
    'thr_012_makeup_lab',
    'Make-up lab for CSE401 — Saturday',
    [FACULTY, 'cse401.coord@aust.edu'],
    [
      {
        sender: 'cse401.coord@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(2, 6),
        body: 'Dear faculty, can we schedule the make-up lab for CSE401 on Saturday 10 AM? We have 6 students to accommodate.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(2, 6), 1),
        body: 'Saturday 10 AM works. Lab 2 booked.',
      },
    ],
  ),

  // ===== STUDENTS (ROUTINE 1d, REPLIED) =====
  t(
    'thr_013_general_query',
    'Course material upload query',
    ['sabbir.cse401@aust.edu', FACULTY],
    [
      {
        sender: 'sabbir.cse401@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(1, 4),
        body: 'Respected Sir, when will the lecture slides for Module 4 be uploaded to the portal? Thanks, Sabbir.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 4), 1),
        body: 'Slides uploaded earlier today. Check the portal.',
      },
    ],
  ),

  // ===== EXAMINATIONS (ROUTINE 1d, REPLIED) =====
  t(
    'thr_014_paper_setting',
    'Final paper setting committee — CSE321',
    ['exam.committee@aust.edu', FACULTY],
    [
      {
        sender: 'exam.committee@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(1, 9),
        body: 'Respected Sir/Madam, the final paper setting committee for CSE321 meets on Wednesday 10 AM. Please bring your draft questions for Modules 1-5.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 9), 3),
        body: 'Will attend with draft Module 4 + 5 questions.',
      },
    ],
  ),

  // ===== EXAMINATIONS (ROUTINE 4d, STALE, UNREPLIED) =====
  t(
    'thr_015_script_distribution',
    'Script distribution for CSE307 grading',
    ['exam.branch@aust.edu', FACULTY],
    [
      {
        sender: 'exam.branch@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(4, 0),
        body: 'Dear faculty, your CSE307 scripts (47 bundles) are ready for collection from the Exam Branch. Please collect by Friday 4 PM.',
      },
    ],
  ),

  // ===== COMMITTEE/ADMIN (ROUTINE 1d, REPLIED) =====
  t(
    'thr_016_circular_hostel',
    'Hostel allotment circular — September 2026',
    [REGISTRAR, FACULTY],
    [
      {
        sender: REGISTRAR,
        senderIsFaculty: false,
        sentAt: ago(1, 6),
        body: 'Respected all, please find attached the hostel allotment circular for September 2026. Effective immediately.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(1, 6), 4),
        body: 'Acknowledged.',
      },
    ],
  ),

  // ===== COMMITTEE/ADMIN (ROUTINE 2d, REPLIED) =====
  t(
    'thr_017_circular_accounts',
    'Travel reimbursement — claim submission',
    ['accounts@aust.edu', FACULTY],
    [
      {
        sender: 'accounts@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(2, 7),
        body: 'Respected faculty, please submit your travel reimbursement claims for August by 15 Sep. Attach all original bills.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(2, 7), 2),
        body: 'Will submit by 14 Sep. Thanks.',
      },
    ],
  ),

  // ===== COMMITTEE/ADMIN (ROUTINE 3d, REPLIED) =====
  t(
    'thr_018_notice_ao',
    'AO office — procurement approval',
    ['ao@aust.edu', FACULTY],
    [
      {
        sender: 'ao@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(3, 2),
        body: 'Dear faculty, your procurement request for lab equipment has been approved. Please collect the items from the AO store between 10 AM and 4 PM.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(3, 2), 6),
        body: 'Collected today. Thank you.',
      },
    ],
  ),

  // ===== RESEARCH (ROUTINE 2d, REPLIED) =====
  t(
    'thr_019_research_collab',
    'Research collaboration — IEEE paper draft',
    ['dr.kabir@aust.edu', FACULTY],
    [
      {
        sender: 'dr.kabir@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(2, 5),
        body: 'Dear colleague, attached is the draft of our collaborative IEEE paper. Could you review Sections 3 and 4 by next week? Thanks.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(2, 5), 12),
        body: 'Will review by Wednesday. Sending tracked changes.',
      },
    ],
  ),

  // ===== RESEARCH (ROUTINE 5d, STALE, UNREPLIED) =====
  t(
    'thr_020_journal_review',
    'Journal review request — JETCS',
    ['editor.jetcs@journals.com', FACULTY],
    [
      {
        sender: 'editor.jetcs@journals.com',
        senderIsFaculty: false,
        sentAt: ago(5, 1),
        body: 'Dear Dr., you have been nominated as a reviewer for manuscript ID JETCS-2026-0447. Please confirm acceptance within 7 days. The review is due in 4 weeks.',
      },
    ],
  ),

  // ===== OTHER (NEW 4h, REPLIED) — NEWSLETTER =====
  t(
    'thr_021_newsletter',
    '[aust-announce] Faculty development programme — October 2026',
    ['announce@aust.edu', FACULTY],
    [
      {
        sender: 'announce@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(0, 4),
        body: 'Dear faculty, registrations are open for the Faculty Development Programme on AI in Higher Education, 12-14 October 2026. Limited seats.',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(0, 4), 1),
        body: 'Will register next week. Thanks.',
      },
    ],
  ),

  // ===== OTHER (NEW 2d, REPLIED) — MAILING LIST =====
  t(
    'thr_022_noise_promotions',
    '[faculty-lounge] Coffee machine donation drive',
    ['faculty-lounge@aust.edu', FACULTY],
    [
      {
        sender: 'faculty-lounge@aust.edu',
        senderIsFaculty: false,
        sentAt: ago(2, 8),
        body: 'Hi all, contributing Tk 500 each for the new coffee machine in the faculty lounge. Reply to this thread to opt in. Thanks!',
      },
      {
        sender: FACULTY,
        senderIsFaculty: true,
        sentAt: fwd(ago(2, 8), 3),
        body: 'In.',
      },
    ],
  ),
];

export default SEED_THREADS;
