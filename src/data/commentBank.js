// Source sentences for the mock feedback generator, grouped by theme and sentiment.
// `{topic}` is replaced with a topic from the module (e.g. "SQL joins").
// Written to read like real student feedback; none of it comes from real students.
export const commentBank = {
  'lab-instructions': {
    positive: [
      'The lab instructions for {topic} were clear and easy to follow.',
      'Really liked that the lab guide explains why each step matters, not just what to click.',
      'The step-by-step lab sheet made {topic} much less intimidating.',
      'Lab guide was well structured this week, I finished within the session.',
      'Appreciate the troubleshooting section at the end of the lab instructions.',
    ],
    neutral: [
      'The lab is useful but some steps are unclear.',
      'Lab instructions were okay, though a checklist at the start would help.',
      'Most of the lab guide made sense, I just needed to ask about one step on {topic}.',
      'The lab covered {topic} as expected. Nothing major to add.',
    ],
    negative: [
      'The lab instructions are difficult to understand.',
      'The screenshots in the lab guide do not match what we see on screen.',
      'The lab guide was confusing this week and half the class got stuck on the same step.',
      'Steps in the {topic} lab are out of order, we had to guess what came next.',
      'Lab instructions assume we already know {topic}, which we have not covered yet.',
      'Spent most of the lab trying to work out what the instructions meant instead of learning.',
      'The lab sheet skips important steps. Please add the missing commands.',
      'The {topic} lab guide refers to files that are not in the starter folder.',
      'Expected outputs in the {topic} lab sheet are different from what we actually get.',
      'Nobody at my table could finish the {topic} lab because step 4 was unclear.',
      'The lab instructions for {topic} changed halfway through the session, which was confusing.',
      'Please number the steps in the {topic} lab guide, it is hard to tell where you are.',
      'The {topic} lab needed a short demo first, the written instructions were not enough.',
    ],
  },
  'lecture-pace': {
    positive: [
      'Lecture pace is just right, there is time to take notes and ask questions.',
      'Good that the lecturer pauses after each section on {topic} to check understanding.',
      'The recap at the start of each lecture helps me keep up.',
      'Pacing felt comfortable even for the harder topics like {topic}.',
    ],
    neutral: [
      'Lectures are a bit fast in the second half but manageable with the recordings.',
      'Pace is fine for most topics, {topic} felt rushed though.',
      'Sometimes too fast, sometimes too slow, depends on the week.',
    ],
    negative: [
      'Lectures move too fast, especially when covering {topic}.',
      'The slides go by too quickly to copy down the examples.',
      'We covered three weeks of content on {topic} in one lecture, it was overwhelming.',
      'Please slow down during the worked examples, I lose track halfway.',
      'The last 20 minutes of each lecture are always rushed.',
      'The {topic} lecture skipped from definitions to exam-level questions too quickly.',
      'Too much content per lecture, I need the recording to catch up on {topic} every week.',
    ],
  },
  assessment: {
    positive: [
      'The assignment brief is clear and the rubric tells us exactly what is expected.',
      'Quiz questions match what was taught, which feels fair.',
      'Really helpful that the practice test on {topic} came with worked solutions.',
      'Feedback on the first assignment was detailed and useful.',
    ],
    neutral: [
      'Assessment weighting is reasonable, would like the rubric released earlier.',
      'The quiz was fair but the time limit was tight.',
      'Not sure yet how the project on {topic} will be graded, but the brief is okay.',
    ],
    negative: [
      'The assignment requirements are vague and keep changing on the forum.',
      'The quiz tested {topic} in far more depth than the lectures did.',
      'We still have not received marks for the first assignment.',
      'Two assessments are due in the same week as other modules, which is stressful.',
      'The rubric does not explain how the {topic} section is marked.',
    ],
  },
  'teaching-quality': {
    positive: [
      'The lecturer explains {topic} really clearly with good real-world examples.',
      'Very approachable and patient when answering questions.',
      'Best explanation of {topic} I have had so far.',
      'The lecturer clearly cares about us understanding the material.',
      'Great use of live demos, it makes the concepts click.',
      'Enthusiastic teaching makes the lectures engaging.',
      'The worked example on {topic} finally made it make sense for me.',
      'The lecturer now checks in with the class more often, which really helps.',
    ],
    neutral: [
      'Teaching is fine overall, more examples on {topic} would help.',
      'Explanations are good but sometimes hard to hear at the back of the room.',
      'Solid teaching, though the demos occasionally run over time.',
    ],
    negative: [
      'Explanations of {topic} jump straight into details without the big picture.',
      'Questions on the forum take a long time to be answered.',
      'The lecture mostly reads from the slides, which is hard to stay engaged with.',
    ],
  },
  'learning-materials': {
    positive: [
      'The slides and notes are well organised and easy to revise from.',
      'The extra readings on {topic} were really helpful.',
      'Lecture recordings are uploaded quickly, which helps a lot.',
      'Love the summary sheet at the end of each week.',
    ],
    neutral: [
      'Materials are okay, some slides have too much text.',
      'Would be nice to have the slides a day before the lecture.',
      'The notes on {topic} are fine but could use more diagrams.',
    ],
    negative: [
      'Some slides on {topic} have errors that were never corrected.',
      'Materials are uploaded late, so we cannot prepare before class.',
      'The recommended textbook chapters do not match the lecture content.',
      'Links in the course page for {topic} are broken.',
    ],
  },
  tutorials: {
    positive: [
      'Tutorials are the most useful part of the module for practising {topic}.',
      'The tutor walks through each question properly, very helpful.',
      'Small tutorial groups make it easy to ask questions.',
      'Tutorial questions build nicely on the lecture content.',
    ],
    neutral: [
      'Tutorials are helpful but there is not enough time to finish all questions.',
      'Would prefer tutorial solutions to be released after the session.',
      'Tutorial on {topic} was okay, some questions were repetitive.',
    ],
    negative: [
      'Tutorial questions on {topic} were not covered in lectures yet.',
      'The tutorial just reads out answers without explaining them.',
      'Tutorial room is too crowded to get any help.',
    ],
  },
  workload: {
    positive: [
      'Workload is manageable and spread out well across the weeks.',
      'Weekly tasks are a reasonable size, I can keep up with other modules.',
      'Good balance between lectures, labs and self-study.',
    ],
    neutral: [
      'Workload is heavy in some weeks but lighter in others.',
      'Manageable so far, but I am worried about the project on {topic}.',
      'Reasonable workload, though the readings take longer than expected.',
    ],
    negative: [
      'The workload for this module is much heavier than others worth the same credits.',
      'Weekly lab reports plus the project on {topic} is too much at the same time.',
      'I spend more than 15 hours a week on this module, which is not sustainable.',
      'Too many small deliverables every week, it is hard to focus on learning.',
      'The {topic} milestone landed in the same week as two other project deadlines.',
      'The team project on {topic} takes far more time than the credit weighting suggests.',
    ],
  },
  'technical-issues': {
    positive: [
      'The lab environment was set up smoothly, everything worked first time.',
      'Tech support responded quickly when my account had issues.',
      'The virtual machines were stable throughout the lab.',
    ],
    neutral: [
      'Had a small login issue with the lab environment but it was fixed quickly.',
      'The software for {topic} is slow on older laptops but usable.',
      'Occasional Wi-Fi drops in the lab room.',
    ],
    negative: [
      'The lab environment kept crashing during the {topic} exercise.',
      'Our lab credits ran out before we could finish the exercise.',
      'The required software does not install on Mac, nobody could help.',
      'Could not access the lab portal for most of the session.',
      'Lab machines are missing the software version used in the guide.',
      'The {topic} environment timed out every few minutes and we lost our work.',
      'Half the class could not log in for the {topic} exercise.',
    ],
  },
};
