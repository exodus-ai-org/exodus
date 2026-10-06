// The chat's section on interactive blocks (exodus-ios spec 2026-10-06 §3):
// the two fenced blocks both apps draw as controls, and the answer that comes
// back. Only the chat's own prompt (`getSystemPrompt`) carries it — Health,
// the period reports, Deep Research and titles have prompts of their own.
// Every chat turn reads it, so it stays short.

/** The questionnaire the section shows; a test holds that it validates. */
export const ASK_EXAMPLE = {
  title: 'A few details first',
  questions: [
    {
      id: 'where',
      text: 'Where does it itch most?',
      type: 'single',
      options: ['Lower legs', 'Arms', 'All over'],
      other: true
    },
    {
      id: 'when',
      text: 'When is it worst?',
      type: 'multi',
      options: ['After a shower', 'At night', 'All day']
    }
  ],
  note: 'Anything else I should know?',
  submit: 'Send'
}

/** The confirmation the section shows; a test holds that it validates. */
export const CONFIRM_EXAMPLE = {
  title: 'Add this trip to your calendar?',
  details: 'Oct 21–25, five days, 17 stops; calendar *Travel*.',
  approve: 'Add it',
  reject: 'Not now',
  note: 'Anything to change?'
}

const FENCE = '```'

export const INTERACTIVE_BLOCKS_PROMPT = `<interactive_blocks>
Both apps draw two fenced blocks as controls inside your reply; the user's answer comes back as a message.

\`exodus-ask\` is a questionnaire. Use it when your answer depends on facts only the user has — their situation, preferences, constraints — and a few short choices get them faster than prose. Ask only what changes your answer; what you can reasonably assume, assume and say so. 1–8 questions, 2–8 short options each; "type" is "single" or "multi"; "other": true adds a choice the user types into.
${FENCE}exodus-ask
${JSON.stringify(ASK_EXAMPLE)}
${FENCE}

\`exodus-confirm\` is a confirmation. Use it before an action that changes something outside this chat — writing or deleting files, sending a message or an email, booking, adding to a calendar, spending money, and every hard stop above — then do nothing until the answer comes. Say what will happen in "details" (Markdown), briefly.
${FENCE}exodus-confirm
${JSON.stringify(CONFIRM_EXAMPLE)}
${FENCE}

Rules
- At most one block per reply, after what you write, on lines of its own; never inside another code block, a list, a quote or a table.
- The JSON is one object with only these keys. Limits: title 200 characters, question 200, option 80, note 120, submit/approve/reject 40, details 1000; question ids are lowercase letters, digits, "_" or "-", each used once.
- Write the block's words in the user's language.
- A user message that opens with ${FENCE}exodus-answer answers the questionnaire or confirmation you asked: act on it, do not ask again. "—" is a question left blank; carry on with what you have. A rejected confirmation means do not do it.
- Tools the app gates itself still ask the user on their own; do not add a confirmation for them.
</interactive_blocks>`
