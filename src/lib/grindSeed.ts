// 50 satirical, company-name-free seed posts for #TheGrind feed.
// Kept client-side only — never inserted into the DB. They rotate to the
// top on a timer so the feed feels alive between real submissions.

export type SeedPost = {
  id: string;
  body: string;
  tags: string[];
};

export const GRIND_SEED_POSTS: SeedPost[] = [
  { id: "seed-01", body: "Recruiter: 'We move fast.' Also recruiter: 4 weeks of silence after round 5.", tags: ["Ghosted 30 Days"] },
  { id: "seed-02", body: "ATS rejected me in 11 seconds. My résumé didn't even finish uploading.", tags: ["Instant Rejection"] },
  { id: "seed-03", body: "Take-home: 'Should take 3-4 hours.' Reality: 14 hours, 2 unit test frameworks, and a Docker compose file.", tags: ["7-Round Interview"] },
  { id: "seed-04", body: "Told me I was 'overqualified' then reposted the role with a lower band the same afternoon.", tags: [] },
  { id: "seed-05", body: "AI screener asked me to smile more. I'm applying to a backend infra role.", tags: ["AI Assessment Choke"] },
  { id: "seed-06", body: "Round 6 was with the CEO's dog walker. I don't know what to make of this industry anymore.", tags: ["7-Round Interview"] },
  { id: "seed-07", body: "Got 'strong hire' feedback verbally, then rejection email 20 minutes later. Culture.", tags: [] },
  { id: "seed-08", body: "HR asked for my last 3 payslips before the first tech round. Politely declined. Politely ghosted.", tags: ["Ghosted 30 Days"] },
  { id: "seed-09", body: "Job listed 'competitive comp'. Recruiter's opener: 'Our max is 40% below your current.'", tags: [] },
  { id: "seed-10", body: "'We're a family' translated: unpaid on-call and no PTO approval in Q4.", tags: [] },
  { id: "seed-11", body: "System design round with a PM who kept saying 'blockchain but for CRUD'.", tags: [] },
  { id: "seed-12", body: "Recruiter ghosted me. Then messaged 4 months later: 'Still open to chatting?' No.", tags: ["Ghosted 30 Days"] },
  { id: "seed-13", body: "Take-home graded by an intern who left a comment: 'idk this looks fine i guess'.", tags: [] },
  { id: "seed-14", body: "5-round loop for a 6-month contract with no extension. I'm the problem for showing up.", tags: ["7-Round Interview"] },
  { id: "seed-15", body: "Auto-rejection at 2:47 AM. Bro even the bots are on-call.", tags: ["Instant Rejection"] },
  { id: "seed-16", body: "'Culture fit' round = 45 minutes of the hiring manager talking about their marathon.", tags: [] },
  { id: "seed-17", body: "Job description had 11 'must haves'. Recruiter admitted 7 were 'aspirational'.", tags: [] },
  { id: "seed-18", body: "Was told 'you'll hear back by Friday' on 6 separate Fridays now.", tags: ["Ghosted 30 Days"] },
  { id: "seed-19", body: "Video interview platform kept flagging me for 'suspicious eye movement'. I have eyes.", tags: ["AI Assessment Choke"] },
  { id: "seed-20", body: "Reference check happened AFTER the offer was rescinded. Efficient.", tags: [] },
  { id: "seed-21", body: "'We need someone senior enough to mentor but junior enough to still write tickets.'", tags: [] },
  { id: "seed-22", body: "Panel of 6. Two didn't turn on cameras. One was clearly on another call.", tags: ["7-Round Interview"] },
  { id: "seed-23", body: "Rejected because 'you asked too many questions about scope'. Yes. That was the interview.", tags: [] },
  { id: "seed-24", body: "Offer letter had the wrong name, wrong title, wrong start date. Signed anyway. I'm tired.", tags: [] },
  { id: "seed-25", body: "Recruiter: 'This role is remote.' Contract: 'On-site 4 days, hybrid Thursdays, mandatory offsite quarterly.'", tags: [] },
  { id: "seed-26", body: "Take-home asked me to redesign their entire billing system. For free. In 48 hours.", tags: [] },
  { id: "seed-27", body: "'We value work-life balance' — sent from Slack at 11:47 PM on a Saturday.", tags: [] },
  { id: "seed-28", body: "Applied at 9:02 AM. Rejected at 9:04 AM. Personalised email said 'after careful review'.", tags: ["Instant Rejection"] },
  { id: "seed-29", body: "The 'quick 15-min chat' was a 90-minute behavioural interview with a scorecard.", tags: [] },
  { id: "seed-30", body: "Coding round on a whiteboard tool from 2011 that crashed every 4 minutes.", tags: [] },
  { id: "seed-31", body: "Offer expired in 24 hours 'to see how serious you are'. Serious about what, exactly.", tags: [] },
  { id: "seed-32", body: "LinkedIn: 12 mutual connections. Recruiter: 'We don't know anyone in common, unfortunately.'", tags: [] },
  { id: "seed-33", body: "Referred by 3 people. Still auto-rejected. The ATS eats its own.", tags: ["Instant Rejection"] },
  { id: "seed-34", body: "Was asked to 'walk through the résumé' four times across four rounds. It's the same résumé.", tags: ["7-Round Interview"] },
  { id: "seed-35", body: "Recruiter said the role was 'urgent'. It's been on the board for 8 months.", tags: [] },
  { id: "seed-36", body: "Final round with the founder. He fell asleep on camera. I got the rejection anyway.", tags: [] },
  { id: "seed-37", body: "'We prefer candidates who are excited about our mission.' The mission was ad-tech retargeting.", tags: [] },
  { id: "seed-38", body: "Panel asked if I'd take a pay cut 'for the equity'. Equity was 0.001% at Series D.", tags: [] },
  { id: "seed-39", body: "AI cover letter reviewer told me my letter was 'too personal'. It was 4 sentences.", tags: ["AI Assessment Choke"] },
  { id: "seed-40", body: "Rejected because 'you seem like you'd want the manager's job in a year'. I'm applying for the manager role.", tags: [] },
  { id: "seed-41", body: "Loop feedback: 'Great candidate. Not a fit right now.' Reposted the role at a lower band the next day.", tags: [] },
  { id: "seed-42", body: "'Culture add' round with 8 people. Nobody knew what team the role sat on.", tags: [] },
  { id: "seed-43", body: "Was told to expect a decision 'end of week'. It's been 6 end-of-weeks.", tags: ["Ghosted 30 Days"] },
  { id: "seed-44", body: "Sent a polite follow-up. Got the auto-reject 4 minutes later. Some things are triggers, apparently.", tags: [] },
  { id: "seed-45", body: "Recruiter forwarded me the wrong job description. Interviewed for it anyway. Got the offer. Different role.", tags: [] },
  { id: "seed-46", body: "'Please do not use AI to prepare.' Then their interviewer clearly read questions off ChatGPT.", tags: [] },
  { id: "seed-47", body: "Take-home evaluation rubric leaked in the shared drive. 'Passion' was worth more points than 'correctness'.", tags: [] },
  { id: "seed-48", body: "Rejected for 'lacking leadership signal'. I led the last two rounds because the interviewer didn't prepare.", tags: [] },
  { id: "seed-49", body: "Offer negotiation call became a lecture about how 'money isn't everything at this stage'. It's a Series C.", tags: [] },
  { id: "seed-50", body: "Applied to 214 roles this quarter. 3 replies. 1 was a scam. I'm doing great, thanks for asking.", tags: [] },
];
