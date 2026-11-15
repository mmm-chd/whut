import type { InspectionPointId } from '../scene-04-percy-inspection/inspectionState';

/**
 * The info text on each part's card, as revised by the story team (15 Nov 2026).
 * Each entry is a list of paragraphs, shown as plain text (no activities).
 */
export const P05_INFO: Readonly<Record<InspectionPointId, readonly string[]>> = {
  cameras: [
    'Did you know Percy has 19 cameras on his body? Each one has a special job! Some help him find his way, some help him spot rocks and holes in his path, and some snap science photos. A few even peek at his rock samples, and others helped him land safely on Mars. And look up! The two cameras on top of his mast are called Mastcam-Z. They sit side by side like a pair of eyes, hehe!',
  ],
  microphone: [
    'Have you ever sent a voice message to your grandparents? Your phone’s microphone catches your voice and sends it to them. Cool, right? Percy has microphones too! They listen to the wind and to the rocks on Mars, then send those sounds all the way to Earth. Scientists use them to learn more about the Red Planet.',
  ],
  moxie: [
    'Psst... did you know Percy carries a special box? It’s called MOXIE! Before Percy flew to Mars, scientists tucked it inside him to test something big... Can you guess what? MOXIE is a machine that makes oxygen! Imagine if people could breathe easy on Mars one day with oxygen made right there. That’s exactly what MOXIE was testing!',
  ],
  'earth-team': [
    'Percy isn’t exploring Mars all by himself. He has a big team back on Earth at NASA’s Jet Propulsion Laboratory in California! Every day, the team looks at the photos and data Percy sent and makes a plan: Where should he drive? Which rock should he study? Then they send the instructions across space to Mars.',
    'But here’s the tricky part: Mars is SO far away that a message takes between 5 and 20 minutes to get there. That means the team can’t steer Percy like a remote-control car. Instead, they send a whole day’s plan at once, and Percy follows it on his own. He can even drive by himself, using his cameras to spot rocks and pick a safe path! When the day is done, he sends his news back home. Teamwork across millions of kilometers... wow!',
  ],
};
