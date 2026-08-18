/**
 * SIDE EYE — Question library.
 *
 * Every entry is a PAIR:
 *   a = the question the MAJORITY receives
 *   b = the question the ODD player receives
 *
 * Quality bar for every pair (the "six players" test):
 *   1. Can at least three believable answers work for BOTH questions?
 *   2. Could an innocent player accidentally look guilty?
 *   3. Could the odd player reasonably believe their question is the normal one?
 *   4. Does the reveal produce a satisfying "OHHHH" ?
 *
 * `decoys` are the wrong options shown to the odd player during the
 * "what do you think everyone else got?" bonus guess. They must be plausible.
 *
 * Fields:
 *   id       unique, stable
 *   mode     classic | friends | chaos | afterdark
 *   type     standard | reverse        (reverse = opposite framing, used for REVERSE rounds)
 *   tags     topical tags (used for decoy fallback + variety pacing)
 *   spice    1 (mild) .. 3 (bold)      — used to ramp difficulty across a game
 *   personal true when answers are other players' names (FRIENDS mode)
 *   minPlayers optional floor
 */

export const PAIRS = [
  /* ────────────────────────────── CLASSIC ────────────────────────────── */
  {
    id: 'c01', mode: 'classic', tags: ['places', 'dating'], spice: 1, cats: ['dating', 'everyday', 'clean'],
    a: 'Where would you take someone on a first date?',
    b: 'Where would you take a 7-year-old for their birthday?',
    decoys: ['Where would you celebrate a graduation?', 'Where would you go on a rainy afternoon?'],
  },
  {
    id: 'c02', mode: 'classic', tags: ['phone', 'secrets'], spice: 2, cats: ['everyday'],
    a: 'Something you would hate your boss finding on your phone',
    b: 'Something you would hate your parents finding on your phone',
    decoys: ['Something you would hate to lose off your phone', 'Something everyone has too much of on their phone'],
  },
  {
    id: 'c03', mode: 'classic', tags: ['objects', 'travel'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would hate to forget on vacation',
    b: 'Something you would hate to forget at the gym',
    decoys: ['Something you would hate to forget at the airport', 'Something you always overpack'],
  },
  {
    id: 'c04', mode: 'classic', tags: ['objects', 'places'], spice: 2, cats: ['everyday'],
    a: 'Something you would find in a hotel room',
    b: "Something you would find in someone's bedroom",
    decoys: ['Something you would find in an Airbnb', 'Something you would find in a hospital room'],
  },
  {
    id: 'c05', mode: 'classic', tags: ['disaster', 'dating'], spice: 2, cats: ['dating', 'party', 'everyday'],
    a: 'Something that could ruin a wedding',
    b: 'Something that could ruin a first date',
    decoys: ['Something that could ruin a family holiday', 'Something that could ruin a vacation'],
  },
  {
    id: 'c06', mode: 'classic', tags: ['lying', 'work'], spice: 2, cats: ['dating', 'everyday'],
    a: 'Something you might lie about on a first date',
    b: 'Something you might lie about in a job interview',
    decoys: ['Something you might lie about to your parents', 'Something people exaggerate about constantly'],
  },
  {
    id: 'c07', mode: 'classic', tags: ['places', 'awkward'], spice: 1, cats: ['everyday', 'clean'],
    a: 'A bad place to fall asleep',
    b: 'A bad place to start laughing',
    decoys: ['A bad place to get a phone call', 'A bad place to be hungry'],
  },
  {
    id: 'c08', mode: 'classic', tags: ['objects', 'outdoors'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would bring to a pool',
    b: 'Something you would bring camping',
    decoys: ['Something you would bring to the beach', 'Something you would bring on a road trip'],
  },
  {
    id: 'c09', mode: 'classic', tags: ['sharing', 'work'], spice: 2, cats: ['everyday'],
    a: 'Something you would never share with a roommate',
    b: 'Something you would never share with a coworker',
    decoys: ['Something you would never lend to a friend', 'Something you would never share with a sibling'],
  },
  {
    id: 'c10', mode: 'classic', tags: ['excuses', 'social'], spice: 1, cats: ['party', 'everyday', 'clean'],
    a: 'A reason to leave a party early',
    b: 'A reason to leave work early',
    decoys: ['A reason to cancel plans last minute', 'A reason to skip a family dinner'],
  },
  {
    id: 'c11', mode: 'classic', tags: ['objects', 'people'], spice: 1, cats: ['everyday', 'clean'],
    a: "Something you would find in a teenager's backpack",
    b: "Something you would find in a dad's garage",
    decoys: ["Something you would find in a grandma's purse", "Something you would find in a college dorm"],
  },
  {
    id: 'c12', mode: 'classic', tags: ['social', 'truth'], spice: 2, cats: ['everyday'],
    a: 'Something people pretend to enjoy',
    b: 'Something people pretend to understand',
    decoys: ['Something people pretend to have read', 'Something everyone claims to be good at'],
  },
  {
    id: 'c13', mode: 'classic', tags: ['naming', 'funny'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'A terrible name for a restaurant',
    b: 'A terrible name for a pet',
    decoys: ['A terrible name for a band', 'A terrible name for a baby'],
  },
  {
    id: 'c14', mode: 'classic', tags: ['food'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something you would never eat cold',
    b: 'Something you would never eat in public',
    decoys: ['Something you would never eat for breakfast', 'Something you would never order on a date'],
  },
  {
    id: 'c15', mode: 'classic', tags: ['awkward', 'work'], spice: 2, cats: ['everyday'],
    a: 'A bad thing to say at a funeral',
    b: 'A bad thing to say in a job interview',
    decoys: ['A bad thing to say at a wedding', 'A bad thing to say to your landlord'],
  },
  {
    id: 'c16', mode: 'classic', tags: ['objects', 'travel'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would take to a desert island',
    b: 'Something you would take on a long road trip',
    decoys: ['Something you would take into a bunker', 'Something you would take backpacking'],
  },
  {
    id: 'c17', mode: 'classic', tags: ['patience', 'life'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something worth waiting in line for',
    b: 'Something worth staying up all night for',
    decoys: ['Something worth paying way too much for', 'Something worth driving four hours for'],
  },
  {
    id: 'c18', mode: 'classic', tags: ['excuses'], spice: 1, cats: ['everyday', 'clean'],
    a: 'A good excuse for being late',
    b: 'A good excuse for not texting back',
    decoys: ['A good excuse for missing a deadline', 'A good excuse for leaving early'],
  },
  {
    id: 'c19', mode: 'classic', tags: ['time', 'life'], spice: 2, cats: ['party', 'everyday'],
    a: 'Something that is better in the morning',
    b: 'Something that is better at 2am',
    decoys: ['Something that is better on a weekend', 'Something that is better alone'],
  },
  {
    id: 'c20', mode: 'classic', tags: ['awkward', 'family'], spice: 2, cats: ['everyday'],
    a: 'Something you would never do in front of your in-laws',
    b: 'Something you would never do in front of your boss',
    decoys: ['Something you would never do on a first date', 'Something you would never do at a funeral'],
  },
  {
    id: 'c21', mode: 'classic', tags: ['skills', 'work'], spice: 1, cats: ['party', 'everyday', 'clean'],
    a: 'A skill worth putting on a résumé',
    b: 'A skill worth bragging about at a party',
    decoys: ['A skill everyone should learn', 'A skill that sounds impressive but is useless'],
  },
  {
    id: 'c22', mode: 'classic', tags: ['regret', 'night'], spice: 2, cats: ['party', 'everyday'],
    a: 'Something you would regret buying at 3am',
    b: 'Something you would regret posting at 3am',
    decoys: ['Something you would regret saying out loud', 'Something you would regret agreeing to'],
  },
  {
    id: 'c23', mode: 'classic', tags: ['gifts'], spice: 1, cats: ['party', 'everyday', 'clean'],
    a: 'A bad wedding gift',
    b: 'A bad gift for a five-year-old',
    decoys: ['A bad gift for your boss', 'A bad housewarming gift'],
  },
  {
    id: 'c24', mode: 'classic', tags: ['sneaky', 'objects'], spice: 2, cats: ['everyday'],
    a: 'Something you would sneak into a movie theater',
    b: 'Something you would sneak into a music festival',
    decoys: ['Something you would sneak into a hotel', 'Something you would sneak onto a plane'],
  },
  {
    id: 'c25', mode: 'classic', tags: ['home', 'objects'], spice: 1, cats: ['money', 'everyday', 'clean'],
    a: 'Something that makes a house feel like home',
    b: 'Something that makes a hotel feel expensive',
    decoys: ['Something that makes a room feel bigger', 'Something every apartment needs'],
  },
  {
    id: 'c26', mode: 'classic', tags: ['sharing', 'secrets'], spice: 2, cats: ['everyday'],
    a: 'Something you would never let a friend borrow',
    b: 'Something you would never let a stranger see',
    decoys: ['Something you would never put in a group chat', 'Something you would never leave unlocked'],
  },
  {
    id: 'c27', mode: 'classic', tags: ['weird', 'hobbies'], spice: 2, cats: ['unhinged', 'everyday'],
    a: 'A weird thing to collect',
    b: 'A weird thing to be proud of',
    decoys: ['A weird thing to spend money on', 'A weird hobby to pick up as an adult'],
  },
  {
    id: 'c28', mode: 'classic', tags: ['social', 'school'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something you would hear at a family dinner',
    b: 'Something you would hear in a group project meeting',
    decoys: ['Something you would hear at a work meeting', 'Something you would hear in a waiting room'],
  },
  {
    id: 'c29', mode: 'classic', tags: ['dating', 'work'], spice: 2, cats: ['dating', 'everyday'],
    a: 'A red flag on a résumé',
    b: 'A red flag on a dating profile',
    decoys: ['A red flag in a first text message', 'A red flag when you visit someone’s apartment'],
  },
  {
    id: 'c30', mode: 'classic', tags: ['objects', 'home'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something everyone has too many of in their kitchen',
    b: 'Something everyone has too many of on their phone',
    decoys: ['Something everyone has too many of in their closet', 'Something nobody ever throws away'],
  },
  {
    id: 'c31', mode: 'classic', tags: ['places', 'awkward'], spice: 2, cats: ['dating', 'everyday'],
    a: 'A bad place to take a phone call',
    b: 'A bad place to run into your ex',
    decoys: ['A bad place to have an argument', 'A bad place to be recognized'],
  },
  {
    id: 'c32', mode: 'classic', tags: ['secrets', 'truth'], spice: 2, cats: ['everyday'],
    a: 'Something you would never admit to googling',
    b: 'Something you would never admit to enjoying',
    decoys: ['Something you would never admit to your friends', 'Something everyone secretly does'],
  },
  {
    id: 'c33', mode: 'classic', tags: ['disaster', 'social'], spice: 2, cats: ['everyday'],
    a: 'Something that instantly ruins a road trip',
    b: 'Something that instantly ruins a group chat',
    decoys: ['Something that instantly ruins a party', 'Something that instantly ruins a movie night'],
  },
  {
    id: 'c34', mode: 'classic', tags: ['places', 'objects'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would find in an airport',
    b: 'Something you would find in a hospital',
    decoys: ['Something you would find in a mall', 'Something you would find at a train station'],
  },
  {
    id: 'c35', mode: 'classic', tags: ['rules', 'weird'], spice: 2, cats: ['everyday'],
    a: 'Something you should never microwave',
    b: 'Something you should never do barefoot',
    decoys: ['Something you should never do on an empty stomach', 'Something you should never do in a rental car'],
  },
  {
    id: 'c36', mode: 'classic', tags: ['places', 'emotion'], spice: 2, cats: ['everyday'],
    a: 'A good place to hide something',
    b: 'A good place to cry',
    decoys: ['A good place to take a nap', 'A good place to be alone'],
  },
  {
    id: 'c37', mode: 'classic', tags: ['age', 'life'], spice: 2, cats: ['everyday'],
    a: 'Something that gets funnier the older you get',
    b: 'Something that gets scarier the older you get',
    decoys: ['Something that gets more expensive every year', 'Something nobody warns you about'],
  },
  {
    id: 'c38', mode: 'classic', tags: ['fame', 'work'], spice: 2, cats: ['everyday'],
    a: 'A terrible thing to be famous for',
    b: 'A terrible thing to be known for at work',
    decoys: ['A terrible thing to be known for in your family', 'A terrible thing to trend for online'],
  },
  {
    id: 'c39', mode: 'classic', tags: ['objects', 'school'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would bring to the first day of school',
    b: 'Something you would bring to the first day of a new job',
    decoys: ['Something you would bring to a job interview', 'Something you would bring to a group study session'],
  },
  {
    id: 'c40', mode: 'classic', tags: ['objects', 'habits'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you cannot throw away',
    b: 'Something you cannot stop buying',
    decoys: ['Something you always lose', 'Something you own way too many of'],
  },
  {
    id: 'c41', mode: 'classic', tags: ['opinions'], spice: 2, cats: ['everyday'],
    a: 'Something that is completely overrated',
    b: 'Something that is wildly overpriced',
    decoys: ['Something that is secretly underrated', 'Something people only pretend to like'],
  },
  {
    id: 'c42', mode: 'classic', tags: ['money', 'dares'], spice: 2, cats: ['money', 'everyday'],
    a: 'Something you would do for a thousand dollars',
    b: 'Something you would do on a dare',
    decoys: ['Something you would do to win an argument', 'Something you would never do twice'],
  },
  {
    id: 'c43', mode: 'classic', tags: ['objects', 'home'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something you would find in a shared fridge',
    b: 'Something you would find under a couch',
    decoys: ['Something you would find in a junk drawer', 'Something you would find in the back of a car'],
  },
  {
    id: 'c44', mode: 'classic', tags: ['behavior', 'lying'], spice: 2, cats: ['everyday'],
    a: 'A sign someone is lying',
    b: 'A sign someone is nervous',
    decoys: ['A sign someone is hiding something', 'A sign someone wants to leave'],
  },
  {
    id: 'c45', mode: 'classic', tags: ['objects', 'survival'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would want during a power outage',
    b: 'Something you would want on a camping trip',
    decoys: ['Something you would want in a snowstorm', 'Something you would want on a deserted island'],
  },
  {
    id: 'c46', mode: 'classic', tags: ['food', 'social'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'A meal that is always a safe choice',
    b: 'A meal that is always a mistake at midnight',
    decoys: ['A meal that is always worth the money', 'A meal you could eat every single day'],
  },
  {
    id: 'c47', mode: 'classic', tags: ['work', 'awkward'], spice: 2, cats: ['everyday'],
    a: 'Something you would never say to a police officer',
    b: 'Something you would never say to your landlord',
    decoys: ['Something you would never say to a flight attendant', 'Something you would never say to your dentist'],
  },
  {
    id: 'c48', mode: 'classic', tags: ['places', 'time'], spice: 1, cats: ['everyday', 'clean'],
    a: 'A place that is amazing at night',
    b: 'A place that is amazing when it is empty',
    decoys: ['A place that is better in winter', 'A place everyone should visit once'],
  },
  {
    id: 'c49', mode: 'classic', tags: ['habits', 'truth'], spice: 2, cats: ['everyday'],
    a: 'Something everyone does but nobody admits',
    b: 'Something everyone says but nobody means',
    decoys: ['Something everyone is secretly bad at', 'Something everyone lies about'],
  },
  {
    id: 'c50', mode: 'classic', tags: ['objects', 'sentimental'], spice: 1, cats: ['everyday', 'clean'],
    a: 'Something you would grab if your house was on fire',
    b: 'Something you would take if you were moving abroad tomorrow',
    decoys: ['Something you would put in a time capsule', 'Something you would never sell'],
  },
  {
    id: 'c51', mode: 'classic', tags: ['school', 'work'], spice: 2, cats: ['everyday'],
    a: 'The worst part of group projects',
    b: 'The worst part of family road trips',
    decoys: ['The worst part of moving apartments', 'The worst part of a long meeting'],
  },
  {
    id: 'c52', mode: 'classic', tags: ['weather', 'places'], spice: 1, cats: ['party', 'everyday', 'clean'],
    a: 'Something that instantly makes a day better',
    b: 'Something that instantly makes a party better',
    decoys: ['Something that instantly makes a room better', 'Something that instantly makes a trip better'],
  },

  /* ────────────────────────────── FRIENDS ────────────────────────────── */
  {
    id: 'f01', mode: 'friends', personal: true, tags: ['survival'], spice: 1, cats: ['friends', 'unhinged', 'clean'],
    a: 'Who here would survive longest in a zombie apocalypse?',
    b: 'Who here would accidentally cause the zombie apocalypse?',
    decoys: ['Who here would panic first in an emergency?', 'Who here would be the best leader in a crisis?'],
  },
  {
    id: 'f02', mode: 'friends', personal: true, tags: ['trust'], spice: 2, cats: ['friends'],
    a: 'Who here would you trust most with a secret?',
    b: 'Who here could lie straight to your face?',
    decoys: ['Who here gives the best advice?', 'Who here is the hardest to read?'],
  },
  {
    id: 'f03', mode: 'friends', personal: true, tags: ['living'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here would make the best roommate?',
    b: 'Who here would be the hardest to live with?',
    decoys: ['Who here keeps the cleanest room?', 'Who here would forget to pay rent?'],
  },
  {
    id: 'f04', mode: 'friends', personal: true, tags: ['fame'], spice: 2, cats: ['friends'],
    a: 'Who here is most likely to become famous?',
    b: 'Who here is most likely to go viral for the wrong reason?',
    decoys: ['Who here would handle fame the worst?', 'Who here would love being on camera?'],
  },
  {
    id: 'f05', mode: 'friends', personal: true, tags: ['night'], spice: 2, cats: ['friends', 'party'],
    a: 'Who here would you call at 3am in an emergency?',
    b: 'Who here would be calling you at 3am for no reason?',
    decoys: ['Who here is always awake the latest?', 'Who here never answers their phone?'],
  },
  {
    id: 'f06', mode: 'friends', personal: true, tags: ['advice'], spice: 2, cats: ['friends'],
    a: 'Who here gives the best advice?',
    b: 'Who here gives the most confident wrong advice?',
    decoys: ['Who here would make the best therapist?', 'Who here always thinks they are right?'],
  },
  {
    id: 'f07', mode: 'friends', personal: true, tags: ['chaos'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is most likely to lose their phone tonight?',
    b: 'Who here is most likely to lose an argument tonight?',
    decoys: ['Who here is most likely to be late tonight?', 'Who here is most likely to fall asleep first?'],
  },
  {
    id: 'f08', mode: 'friends', personal: true, tags: ['travel'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here would plan the best trip?',
    b: 'Who here would miss the flight?',
    decoys: ['Who here overpacks the most?', 'Who here would be the best travel buddy?'],
  },
  {
    id: 'f09', mode: 'friends', personal: true, tags: ['humor'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is genuinely the funniest?',
    b: 'Who here laughs hardest at their own jokes?',
    decoys: ['Who here has the best comebacks?', 'Who here tells the longest stories?'],
  },
  {
    id: 'f10', mode: 'friends', personal: true, tags: ['conflict'], spice: 2, cats: ['friends'],
    a: 'Who here would win a fight?',
    b: 'Who here would start it?',
    decoys: ['Who here would break it up?', 'Who here would film it?'],
  },
  {
    id: 'f11', mode: 'friends', personal: true, tags: ['smarts'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here would you want on your trivia team?',
    b: 'Who here would you want on your side in an argument?',
    decoys: ['Who here would you want as a study partner?', 'Who here would you want planning your wedding?'],
  },
  {
    id: 'f12', mode: 'friends', personal: true, tags: ['food'], spice: 1, cats: ['friends', 'food', 'clean'],
    a: 'Who here is the best cook?',
    b: 'Who here would burn instant noodles?',
    decoys: ['Who here is the pickiest eater?', 'Who here orders takeout every night?'],
  },
  {
    id: 'f13', mode: 'friends', personal: true, tags: ['dating'], spice: 2, cats: ['friends', 'dating'],
    a: 'Who here is most likely to text their ex tonight?',
    b: 'Who here is most likely to get a text from their ex tonight?',
    decoys: ['Who here falls in love the fastest?', 'Who here has the wildest dating history?'],
  },
  {
    id: 'f14', mode: 'friends', personal: true, tags: ['authority'], spice: 2, cats: ['friends'],
    a: 'Who here would be a great teacher?',
    b: 'Who here would be a terrifying boss?',
    decoys: ['Who here would be the best coach?', 'Who here would micromanage everything?'],
  },
  {
    id: 'f15', mode: 'friends', personal: true, tags: ['life'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is most likely to move to another country?',
    b: 'Who here is most likely to never leave their hometown?',
    decoys: ['Who here would love living alone?', 'Who here would quit their job tomorrow?'],
  },
  {
    id: 'f16', mode: 'friends', personal: true, tags: ['emotion'], spice: 2, cats: ['friends'],
    a: 'Who here forgives the fastest?',
    b: 'Who here holds a grudge the longest?',
    decoys: ['Who here apologizes first?', 'Who here takes things too personally?'],
  },
  {
    id: 'f17', mode: 'friends', personal: true, tags: ['food'], spice: 1, cats: ['friends', 'food', 'clean'],
    a: 'Who here is the pickiest eater?',
    b: 'Who here would eat literally anything?',
    decoys: ['Who here has the weirdest food combos?', 'Who here always finishes everyone’s food?'],
  },
  {
    id: 'f18', mode: 'friends', personal: true, tags: ['survival'], spice: 1, cats: ['friends', 'unhinged', 'clean'],
    a: 'Who here would survive a week without their phone?',
    b: 'Who here would survive a week alone in the woods?',
    decoys: ['Who here would survive a week without coffee?', 'Who here would last longest in silence?'],
  },
  {
    id: 'f19', mode: 'friends', personal: true, tags: ['movies'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is most likely to cry at a movie?',
    b: 'Who here is most likely to talk through a movie?',
    decoys: ['Who here falls asleep in every movie?', 'Who here picks the worst movies?'],
  },
  {
    id: 'f20', mode: 'friends', personal: true, tags: ['deduction'], spice: 2, cats: ['friends'],
    a: 'Who here would make the best detective?',
    b: 'Who here would be the easiest to catch?',
    decoys: ['Who here is the best liar?', 'Who here notices everything?'],
  },
  {
    id: 'f21', mode: 'friends', personal: true, tags: ['now'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is secretly hungry right now?',
    b: 'Who here is secretly tired right now?',
    decoys: ['Who here is checking their phone right now?', 'Who here wants to leave first tonight?'],
  },
  {
    id: 'f22', mode: 'friends', personal: true, tags: ['agreeable'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here says yes to everything?',
    b: 'Who here cancels plans the most?',
    decoys: ['Who here is the hardest to make plans with?', 'Who here always suggests the plan?'],
  },
  {
    id: 'f23', mode: 'friends', personal: true, tags: ['events'], spice: 2, cats: ['friends', 'party'],
    a: 'Who here would you pick to give a speech at your wedding?',
    b: 'Who here would you pick to plan your bachelor party?',
    decoys: ['Who here would you pick as an emergency contact?', 'Who here would you trust to house-sit?'],
  },
  {
    id: 'f24', mode: 'friends', personal: true, tags: ['games'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is the most competitive?',
    b: 'Who here is the sorest loser?',
    decoys: ['Who here cheats at board games?', 'Who here quits games early?'],
  },
  {
    id: 'f25', mode: 'friends', personal: true, tags: ['money'], spice: 2, cats: ['friends', 'money'],
    a: 'Who here would be rich in ten years?',
    b: 'Who here would spend it all in a weekend?',
    decoys: ['Who here is the biggest saver?', 'Who here always forgets their wallet?'],
  },
  {
    id: 'f26', mode: 'friends', personal: true, tags: ['pets'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is most likely to adopt five dogs?',
    b: 'Who here is most likely to give a pet a ridiculous name?',
    decoys: ['Who here would be the best pet owner?', 'Who here talks to animals the most?'],
  },
  {
    id: 'f27', mode: 'friends', personal: true, tags: ['secrets'], spice: 2, cats: ['friends'],
    a: 'Whose search history would be the funniest?',
    b: 'Whose camera roll would be the most confusing?',
    decoys: ['Whose notes app would be the wildest?', 'Whose playlist would surprise everyone?'],
  },
  {
    id: 'f28', mode: 'friends', personal: true, tags: ['group'], spice: 1, cats: ['friends', 'clean'],
    a: 'Who here is the glue of this group?',
    b: 'Who here is the reason plans get chaotic?',
    decoys: ['Who here organizes everything?', 'Who here talks the most in the group chat?'],
  },

  /* ─────────────────────────────── CHAOS ─────────────────────────────── */
  {
    id: 'x01', mode: 'chaos', tags: ['moral'], spice: 3, cats: ['unhinged'],
    a: 'Something you would do if you knew nobody would ever find out',
    b: 'Something you would do if you had one day left to live',
    decoys: ['Something you would do if you were invisible', 'Something you would do with unlimited money'],
  },
  {
    id: 'x02', mode: 'chaos', tags: ['fear'], spice: 3, cats: ['unhinged'],
    a: 'The worst possible thing to hear during surgery',
    b: 'The worst possible thing to hear on an airplane',
    decoys: ['The worst possible thing to hear in an elevator', 'The worst possible thing to hear from a dentist'],
  },
  {
    id: 'x03', mode: 'chaos', tags: ['powers'], spice: 2, cats: ['unhinged'],
    a: 'A genuinely terrible superpower',
    b: 'A genuinely useless talent to be born with',
    decoys: ['A superpower that would ruin your life', 'A talent nobody would pay for'],
  },
  {
    id: 'x04', mode: 'chaos', tags: ['society'], spice: 2, cats: ['unhinged'],
    a: 'Something that should not be legal but is',
    b: 'Something that should not be a job but is',
    decoys: ['Something that should be taught in school but is not', 'Something that should cost more than it does'],
  },
  {
    id: 'x05', mode: 'chaos', tags: ['betrayal'], spice: 3, cats: ['unhinged'],
    a: 'The worst way to find out you have been fired',
    b: 'The worst way to find out you have been dumped',
    decoys: ['The worst way to find out a secret', 'The worst way to be told bad news'],
  },
  {
    id: 'x06', mode: 'chaos', tags: ['awkward'], spice: 3, cats: ['unhinged'],
    a: 'Something you never want to see your teacher doing',
    b: 'Something you never want to see your neighbor doing',
    decoys: ['Something you never want to see your boss doing', 'Something you never want to catch a stranger doing'],
  },
  {
    id: 'x07', mode: 'chaos', tags: ['shouting'], spice: 3, cats: ['unhinged'],
    a: 'Something you could yell to instantly clear a room',
    b: 'Something you could yell to instantly start a fight',
    decoys: ['Something you could yell to get attention', 'Something you should never yell in an airport'],
  },
  {
    id: 'x08', mode: 'chaos', tags: ['skills'], spice: 2, cats: ['unhinged'],
    a: 'A bad thing to be really good at',
    b: 'A bad thing to be famous for in your hometown',
    decoys: ['A bad thing to put on a résumé', 'A bad thing to be the best at in your family'],
  },
  {
    id: 'x09', mode: 'chaos', tags: ['creepy'], spice: 3, cats: ['money', 'unhinged'],
    a: 'Something you would find at an extremely weird garage sale',
    b: "Something you would find in your uncle's basement",
    decoys: ['Something you would find in an abandoned house', 'Something you would find at a flea market'],
  },
  {
    id: 'x10', mode: 'chaos', tags: ['fear'], spice: 2, cats: ['unhinged'],
    a: 'The worst thing to be allergic to',
    b: 'The worst thing to be scared of',
    decoys: ['The worst thing to be bad at', 'The worst thing to be sensitive to'],
  },
  {
    id: 'x11', mode: 'chaos', tags: ['creepy'], spice: 3, cats: ['unhinged'],
    a: 'Something that would be terrifying in the dark',
    b: 'Something that would be terrifying in a mirror',
    decoys: ['Something that would be terrifying in a hospital', 'Something that would be terrifying to hear at night'],
  },
  {
    id: 'x12', mode: 'chaos', tags: ['crime'], spice: 3, cats: ['unhinged'],
    a: 'A crime you could definitely get away with',
    b: 'A crime you would absolutely get caught doing',
    decoys: ['A crime nobody takes seriously', 'A crime that sounds worse than it is'],
  },
  {
    id: 'x13', mode: 'chaos', tags: ['value'], spice: 2, cats: ['money', 'unhinged'],
    a: 'Something you would sell your soul for',
    b: 'Something you would sell online for five dollars',
    decoys: ['Something you would trade your car for', 'Something you would never sell at any price'],
  },
  {
    id: 'x14', mode: 'chaos', tags: ['friendship'], spice: 2, cats: ['unhinged'],
    a: 'The dumbest reason to end a friendship',
    b: 'The dumbest reason to start one',
    decoys: ['The dumbest reason to hold a grudge', 'The dumbest reason to move out'],
  },
  {
    id: 'x15', mode: 'chaos', tags: ['gross'], spice: 3, cats: ['food', 'unhinged'],
    a: 'Something you would hate to find in your food',
    b: 'Something you would hate to find in your bed',
    decoys: ['Something you would hate to find in your car', 'Something you would hate to find in your shoe'],
  },
  {
    id: 'x16', mode: 'chaos', tags: ['emergency'], spice: 2, cats: ['unhinged'],
    a: 'A bad reason to go to the emergency room',
    b: 'A bad reason to call the police',
    decoys: ['A bad reason to pull a fire alarm', 'A bad reason to call your mom'],
  },
  {
    id: 'x17', mode: 'chaos', tags: ['groups'], spice: 2, cats: ['unhinged'],
    a: 'Something a cult would definitely have',
    b: 'Something an extremely intense book club would have',
    decoys: ['Something a secret society would have', 'Something a start-up would definitely have'],
  },
  {
    id: 'x18', mode: 'chaos', tags: ['speech'], spice: 3, cats: ['unhinged'],
    a: 'The worst thing to whisper to someone',
    b: 'The worst thing to shout across a room',
    decoys: ['The worst thing to text someone', 'The worst thing to say into a microphone'],
  },
  {
    id: 'x19', mode: 'chaos', tags: ['design'], spice: 2, cats: ['unhinged'],
    a: 'A terrible mascot for a school',
    b: 'A terrible idea for a tattoo',
    decoys: ['A terrible logo for a bank', 'A terrible name for a sports team'],
  },
  {
    id: 'x20', mode: 'chaos', tags: ['apocalypse'], spice: 2, cats: ['unhinged'],
    a: 'Something that could end civilization',
    b: 'Something that could end a group chat',
    decoys: ['Something that could end a friendship instantly', 'Something that could end a party'],
  },
  {
    id: 'x21', mode: 'chaos', tags: ['death'], spice: 3, cats: ['unhinged'],
    a: 'Something you would never want on your gravestone',
    b: 'Something you would never want on your name tag',
    decoys: ['Something you would never want in your obituary', 'Something you would never want tattooed'],
  },
  {
    id: 'x22', mode: 'chaos', tags: ['escape'], spice: 2, cats: ['unhinged'],
    a: 'Something you would do to get out of jury duty',
    b: 'Something you would do to get out of a family reunion',
    decoys: ['Something you would do to get out of a wedding', 'Something you would do to get out of work'],
  },
  {
    id: 'x23', mode: 'chaos', tags: ['weird'], spice: 3, cats: ['unhinged'],
    a: 'A weird thing to get arrested for',
    b: 'A weird thing to get banned from',
    decoys: ['A weird thing to get sued over', 'A weird thing to get fired for'],
  },
  {
    id: 'x24', mode: 'chaos', tags: ['creepy'], spice: 2, cats: ['unhinged'],
    a: 'Something you would find in a haunted house',
    b: 'Something you would find in an abandoned school',
    decoys: ['Something you would find in a graveyard', 'Something you would find in an attic'],
  },
  {
    id: 'x25', mode: 'chaos', tags: ['money'], spice: 3, cats: ['money', 'unhinged'],
    a: 'Something you would never do for a million dollars',
    b: 'Something you would happily do for twenty dollars',
    decoys: ['Something you would only do for family', 'Something you would do just to win'],
  },
  {
    id: 'x26', mode: 'chaos', tags: ['history'], spice: 2, cats: ['unhinged'],
    a: 'A terrible time period to be alive',
    b: 'A terrible place to be born unlucky',
    decoys: ['A terrible century to be famous', 'A terrible time to be a teenager'],
  },

  /* ───────────────────────────── AFTER DARK ──────────────────────────── */
  {
    id: 'a01', mode: 'afterdark', tags: ['dating'], spice: 2, cats: ['dating'],
    a: 'A red flag on a first date',
    b: 'A red flag in a first text message',
    decoys: ['A red flag on a dating profile', 'A red flag when you meet their friends'],
  },
  {
    id: 'a02', mode: 'afterdark', tags: ['secrets'], spice: 3, cats: ['unhinged'],
    a: 'Something you would never want your partner to find',
    b: 'Something you would never want your friends to find',
    decoys: ['Something you would never want your boss to find', 'Something you would never want screenshotted'],
  },
  {
    id: 'a03', mode: 'afterdark', tags: ['places'], spice: 2, cats: ['dating'],
    a: 'A bad place for a first kiss',
    b: 'A bad place for a serious argument',
    decoys: ['A bad place for a breakup', 'A bad place to meet the parents'],
  },
  {
    id: 'a04', mode: 'afterdark', tags: ['mood'], spice: 3, cats: ['party', 'unhinged'],
    a: 'Something that instantly kills the mood',
    b: 'Something that instantly ends a night out',
    decoys: ['Something that instantly ruins a date', 'Something that instantly changes the vibe'],
  },
  {
    id: 'a05', mode: 'afterdark', tags: ['speech'], spice: 3, cats: ['unhinged'],
    a: 'The worst thing to say in bed',
    b: 'The worst thing to say at 4am',
    decoys: ['The worst thing to say after a date', 'The worst thing to say to someone crying'],
  },
  {
    id: 'a06', mode: 'afterdark', tags: ['lying'], spice: 2, cats: ['dating'],
    a: 'Something people lie about on dating apps',
    b: 'Something people lie about to their friends',
    decoys: ['Something people lie about at work', 'Something people exaggerate on vacation'],
  },
  {
    id: 'a07', mode: 'afterdark', tags: ['night'], spice: 3, cats: ['unhinged'],
    a: 'A bad reason to go home with someone',
    b: 'A bad reason to stay out until sunrise',
    decoys: ['A bad reason to text someone first', 'A bad reason to order another round'],
  },
  {
    id: 'a08', mode: 'afterdark', tags: ['places'], spice: 3, cats: ['unhinged'],
    a: "Something you would find in a stranger's apartment that would worry you",
    b: 'Something you would find in a frat house that would worry you',
    decoys: ["Something you would find in a coworker's apartment", 'Something you would find in a very new relationship'],
  },
  {
    id: 'a09', mode: 'afterdark', tags: ['exes'], spice: 3, cats: ['dating', 'unhinged'],
    a: 'The worst thing to hear from your ex',
    b: 'The worst thing to hear from your roommate',
    decoys: ['The worst thing to hear from your landlord', 'The worst thing to hear from a friend at 2am'],
  },
  {
    id: 'a10', mode: 'afterdark', tags: ['flirting'], spice: 2, cats: ['dating'],
    a: 'A terrible pickup line',
    b: 'A terrible thing to say to a bouncer',
    decoys: ['A terrible opening message', 'A terrible thing to say to a bartender'],
  },
  {
    id: 'a11', mode: 'afterdark', tags: ['dealbreaker'], spice: 2, cats: ['dating'],
    a: 'An instant dealbreaker in someone you are dating',
    b: 'An instant dealbreaker in a roommate',
    decoys: ['An instant dealbreaker in a friend', 'An instant dealbreaker in a coworker'],
  },
  {
    id: 'a12', mode: 'afterdark', tags: ['secrets'], spice: 3, cats: ['unhinged'],
    a: 'Something you would never want in a group chat screenshot',
    b: 'Something you would never want in a family photo album',
    decoys: ['Something you would never want posted publicly', 'Something you would never want printed out'],
  },
  {
    id: 'a13', mode: 'afterdark', tags: ['awkward'], spice: 2, cats: ['dating'],
    a: 'The worst place to run into your ex',
    b: 'The worst place to run into your boss',
    decoys: ['The worst place to run into your parents', 'The worst place to be recognized'],
  },
  {
    id: 'a14', mode: 'afterdark', tags: ['night'], spice: 2, cats: ['party'],
    a: 'Something that makes a night out legendary',
    b: 'Something that makes a night out end early',
    decoys: ['Something that makes a party unforgettable', 'Something that makes a trip go sideways'],
  },
  {
    id: 'a15', mode: 'afterdark', tags: ['timing'], spice: 3, cats: ['dating', 'unhinged'],
    a: 'The worst time to get a text from your ex',
    b: 'The worst time to get a call from your mom',
    decoys: ['The worst time to get a work email', 'The worst time to lose your phone'],
  },
  {
    id: 'a16', mode: 'afterdark', tags: ['hiding'], spice: 3, cats: ['dating', 'unhinged'],
    a: 'Something you would hide before a date comes over',
    b: 'Something you would hide before your parents come over',
    decoys: ['Something you would hide before a landlord inspection', 'Something you would hide from your roommate'],
  },
  {
    id: 'a17', mode: 'afterdark', tags: ['confession'], spice: 3, cats: ['party', 'unhinged'],
    a: 'Something you would only admit at 2am',
    b: 'Something you would only admit to a total stranger',
    decoys: ['Something you would only admit after a drink', 'Something you would only admit in a group chat'],
  },
  {
    id: 'a18', mode: 'afterdark', tags: ['regret'], spice: 3, cats: ['unhinged'],
    a: 'A questionable decision made after midnight',
    b: 'A questionable decision made on vacation',
    decoys: ['A questionable decision made while broke', 'A questionable decision made to impress someone'],
  },
  {
    id: 'a19', mode: 'afterdark', tags: ['parties'], spice: 2, cats: ['party'],
    a: 'Something that ruins a house party',
    b: 'Something that ruins a road trip',
    decoys: ['Something that ruins a night out', 'Something that ruins a group vacation'],
  },
  {
    id: 'a20', mode: 'afterdark', tags: ['names'], spice: 2, cats: ['everyday'],
    a: 'The worst pet name for a partner',
    b: 'The worst nickname to give a friend',
    decoys: ['The worst thing to save someone as in your phone', 'The worst nickname to be stuck with'],
  },
  {
    id: 'a21', mode: 'afterdark', tags: ['inhibition'], spice: 3, cats: ['party', 'unhinged'],
    a: 'Something you would never do sober',
    b: 'Something you would never do in front of your family',
    decoys: ['Something you would never do on camera', 'Something you would never do twice'],
  },
  {
    id: 'a22', mode: 'afterdark', tags: ['emotion'], spice: 2, cats: ['everyday'],
    a: 'A bad place to fall in love',
    b: 'A bad place to get emotional',
    decoys: ['A bad place to have a serious talk', 'A bad place to make a big decision'],
  },
  {
    id: 'a23', mode: 'afterdark', tags: ['truth'], spice: 3, cats: ['unhinged'],
    a: 'Something almost everyone fakes',
    b: 'Something almost everyone brags about',
    decoys: ['Something almost everyone hides', 'Something almost everyone regrets'],
  },
  {
    id: 'a24', mode: 'afterdark', tags: ['history'], spice: 3, cats: ['dating', 'unhinged'],
    a: "The most chaotic thing in someone's dating history",
    b: "The most chaotic thing in someone's search history",
    decoys: ["The most chaotic thing in someone's camera roll", "The most chaotic thing in someone's past"],
  },
  {
    id: 'a25', mode: 'afterdark', tags: ['reputation'], spice: 2, cats: ['party'],
    a: 'A bad thing to be known for at the bar',
    b: 'A bad thing to be known for at work',
    decoys: ['A bad thing to be known for in your friend group', 'A bad thing to be known for online'],
  },

  /* ───────────────────── REVERSE (opposite framing) ───────────────────── */
  {
    id: 'r01', mode: 'classic', type: 'reverse', tags: ['dating'], spice: 2, cats: ['dating', 'everyday'],
    a: 'The best thing that could happen on a first date',
    b: 'The worst thing that could happen on a first date',
    decoys: ['The most surprising thing that could happen on a first date', 'The most memorable thing about a first date'],
  },
  {
    id: 'r02', mode: 'classic', type: 'reverse', tags: ['objects'], spice: 1, cats: ['everyday', 'clean'],
    a: 'The best thing to find in your pocket',
    b: 'The worst thing to find in your pocket',
    decoys: ['The strangest thing to find in your pocket', 'The most useful thing to keep in your pocket'],
  },
  {
    id: 'r03', mode: 'classic', type: 'reverse', tags: ['work'], spice: 2, cats: ['everyday'],
    a: 'The best thing to hear from your boss',
    b: 'The worst thing to hear from your boss',
    decoys: ['The strangest thing to hear from your boss', 'The most common thing to hear from your boss'],
  },
  {
    id: 'r04', mode: 'classic', type: 'reverse', tags: ['places'], spice: 1, cats: ['everyday', 'clean'],
    a: 'The best place to fall asleep',
    b: 'The worst place to fall asleep',
    decoys: ['The strangest place to fall asleep', 'The most common place people nap'],
  },
  {
    id: 'r05', mode: 'classic', type: 'reverse', tags: ['travel'], spice: 2, cats: ['everyday'],
    a: 'The best thing to find in a hotel room',
    b: 'The worst thing to find in a hotel room',
    decoys: ['The strangest thing to find in a hotel room', 'The thing every hotel room should have'],
  },
  {
    id: 'r06', mode: 'classic', type: 'reverse', tags: ['night'], spice: 2, cats: ['party', 'everyday'],
    a: 'The best reason to be woken up at 3am',
    b: 'The worst reason to be woken up at 3am',
    decoys: ['The strangest reason to be awake at 3am', 'The most common reason people wake up at night'],
  },
  {
    id: 'r07', mode: 'classic', type: 'reverse', tags: ['social'], spice: 2, cats: ['party', 'everyday'],
    a: 'The best way for a party to end',
    b: 'The worst way for a party to end',
    decoys: ['The strangest way a party could end', 'The most common way parties end'],
  },
  {
    id: 'r08', mode: 'classic', type: 'reverse', tags: ['phone'], spice: 2, cats: ['everyday'],
    a: 'The best text to get from an unknown number',
    b: 'The worst text to get from an unknown number',
    decoys: ['The strangest text to get from an unknown number', 'The most suspicious text you could receive'],
  },
  {
    id: 'r09', mode: 'classic', type: 'reverse', tags: ['fame'], spice: 2, cats: ['everyday'],
    a: 'The best thing to be famous for',
    b: 'The worst thing to be famous for',
    decoys: ['The strangest thing to be famous for', 'The easiest way to get famous'],
  },
  {
    id: 'r10', mode: 'afterdark', type: 'reverse', tags: ['dating'], spice: 3, cats: ['dating', 'unhinged'],
    a: 'The best thing to hear the morning after',
    b: 'The worst thing to hear the morning after',
    decoys: ['The strangest thing to hear the morning after', 'The most awkward part of the morning after'],
  },

  /* ─────────────────────────────── FOOD ─────────────────────────────── */
  {
    id: 'd01', mode: 'classic', tags: ['food', 'dating'], spice: 1, cats: ['food', 'dating', 'party', 'everyday', 'clean'],
    a: 'Something you would order on a first date',
    b: 'Something you would order at 2am',
    decoys: ['Something you would order when someone else is paying', 'Something you would order at an airport'],
  },
  {
    id: 'd02', mode: 'classic', tags: ['food', 'social'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something you would bring to a potluck',
    b: 'Something you would bring to a picnic',
    decoys: ['Something you would bring to a barbecue', 'Something you would bring to a bake sale'],
  },
  {
    id: 'd03', mode: 'classic', tags: ['food'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'A food that is better cold',
    b: 'A food that is better the next day',
    decoys: ['A food that is better than it sounds', 'A food that is better shared'],
  },
  {
    id: 'd04', mode: 'classic', tags: ['food', 'home'], spice: 2, cats: ['food', 'everyday'],
    a: "Something you would find in a student's fridge",
    b: 'Something you would find in a hotel minibar',
    decoys: ["Something you would find in a coworker's desk drawer", 'Something you would find at the back of any freezer'],
  },
  {
    id: 'd05', mode: 'classic', tags: ['food'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'A topping that ruins a pizza',
    b: 'A topping that ruins a sandwich',
    decoys: ['A topping nobody asks for', 'A topping that starts arguments'],
  },
  {
    id: 'd06', mode: 'classic', tags: ['food', 'home'], spice: 2, cats: ['food', 'everyday'],
    a: 'A snack you would hide from your roommates',
    b: 'A snack you would hide from your kids',
    decoys: ['A snack you would never share', 'A snack you buy just for yourself'],
  },
  {
    id: 'd07', mode: 'classic', tags: ['food'], spice: 2, cats: ['food', 'everyday'],
    a: 'Something you would eat standing over the sink',
    b: 'Something you would eat straight out of the container',
    decoys: ['Something you would eat with your hands', 'Something you would eat in the car'],
  },
  {
    id: 'd08', mode: 'classic', tags: ['food', 'awkward'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'A meal that is impossible to eat politely',
    b: 'A meal that is impossible to eat quietly',
    decoys: ['A meal that is impossible to eat quickly', 'A meal you should never order on a date'],
  },
  {
    id: 'd09', mode: 'classic', tags: ['food', 'regret'], spice: 2, cats: ['food', 'everyday'],
    a: 'Something you always regret ordering',
    b: 'Something you always regret cooking',
    decoys: ['Something you always regret buying', 'Something that never looks like the picture'],
  },
  {
    id: 'd10', mode: 'classic', tags: ['food'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something you would put on toast',
    b: 'Something you would put on a bagel',
    decoys: ['Something you would put on a cracker', 'Something you would put on pancakes'],
  },
  {
    id: 'd11', mode: 'chaos', tags: ['food', 'conflict'], spice: 2, cats: ['food', 'unhinged'],
    a: 'A food that basically counts as a personality',
    b: 'A food that starts arguments',
    decoys: ['A food people are weirdly loyal to', 'A food that divides a room'],
  },
  {
    id: 'd12', mode: 'classic', tags: ['food', 'work'], spice: 2, cats: ['food', 'everyday'],
    a: 'Something you should never microwave at work',
    b: 'Something you should never eat at your desk',
    decoys: ['Something you should never bring on a plane', 'Something that stinks up an entire office'],
  },
  {
    id: 'd13', mode: 'classic', tags: ['food', 'travel'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'Something that always tastes better at a barbecue',
    b: 'Something that always tastes better at the beach',
    decoys: ['Something that always tastes better outdoors', 'Something that always tastes better on holiday'],
  },
  {
    id: 'd14', mode: 'classic', tags: ['food', 'life'], spice: 1, cats: ['food', 'everyday', 'clean'],
    a: 'The last food you would ever give up',
    b: 'The last drink you would ever give up',
    decoys: ['The one thing you could eat every day', 'Something you would miss most on a diet'],
  },
  {
    id: 'd15', mode: 'classic', type: 'reverse', tags: ['food', 'work'], spice: 2, cats: ['food', 'everyday'],
    a: 'The best thing to find in the office kitchen',
    b: 'The worst thing to find in the office kitchen',
    decoys: ['The strangest thing to find in the office kitchen', 'The thing every office kitchen needs'],
  },

  /* ─────────────────────────────── MONEY ─────────────────────────────── */
  {
    id: 'm01', mode: 'classic', tags: ['money'], spice: 1, cats: ['money', 'everyday', 'clean'],
    a: 'Something worth paying extra for',
    b: 'Something worth waiting in line for',
    decoys: ['Something worth saving up for', 'Something worth the hype'],
  },
  {
    id: 'm02', mode: 'classic', tags: ['money', 'objects'], spice: 2, cats: ['money', 'everyday'],
    a: 'Something you would never buy secondhand',
    b: 'Something you would never lend to anyone',
    decoys: ['Something you would never buy online', 'Something you would never share'],
  },
  {
    id: 'm03', mode: 'classic', tags: ['money', 'secrets'], spice: 2, cats: ['money', 'everyday'],
    a: 'A purchase you would hide from your partner',
    b: 'A purchase you would hide from your parents',
    decoys: ['A purchase you would never admit to', 'A purchase you would justify for hours'],
  },
  {
    id: 'm04', mode: 'classic', tags: ['money', 'life'], spice: 2, cats: ['money', 'everyday'],
    a: 'Something people waste money on',
    b: 'Something people waste time on',
    decoys: ['Something people regret spending on', 'Something everyone overpays for'],
  },
  {
    id: 'm05', mode: 'classic', tags: ['money'], spice: 1, cats: ['money', 'everyday', 'clean'],
    a: 'Something you would splurge on with your first paycheck',
    b: 'Something you would splurge on if you won the lottery',
    decoys: ['Something you would buy the second you could afford it', 'Something you would treat yourself to'],
  },
  {
    id: 'm06', mode: 'classic', tags: ['money', 'habits'], spice: 1, cats: ['money', 'everyday', 'clean'],
    a: 'A subscription nobody remembers paying for',
    b: 'A subscription nobody actually uses',
    decoys: ['A subscription everyone means to cancel', 'A subscription that quietly renews forever'],
  },
  {
    id: 'm07', mode: 'classic', tags: ['money', 'work'], spice: 2, cats: ['money', 'everyday'],
    a: 'A bad reason to ask for a raise',
    b: 'A bad reason to quit a job',
    decoys: ['A bad reason to call in sick', 'A bad thing to put in a resignation letter'],
  },
  {
    id: 'm08', mode: 'classic', tags: ['money', 'objects'], spice: 2, cats: ['money', 'everyday'],
    a: 'Something you would sell if you needed cash fast',
    b: 'Something you would put in a garage sale',
    decoys: ['Something you would pawn without thinking', 'Something nobody would actually buy'],
  },
  {
    id: 'm09', mode: 'classic', tags: ['money', 'social'], spice: 2, cats: ['money', 'everyday'],
    a: 'A sign someone actually has money',
    b: 'A sign someone is pretending to have money',
    decoys: ['A sign someone grew up rich', 'A sign someone just got paid'],
  },
  {
    id: 'm10', mode: 'classic', tags: ['money'], spice: 1, cats: ['money', 'everyday', 'clean'],
    a: 'Something you would spend your last twenty on',
    b: 'Something you would spend a whole paycheck on',
    decoys: ['Something you would spend birthday money on', 'Something you always end up buying'],
  },
  {
    id: 'm11', mode: 'classic', tags: ['money', 'friendship'], spice: 2, cats: ['money', 'everyday'],
    a: 'The worst thing to split with friends',
    b: 'The worst thing to share with friends',
    decoys: ['The worst thing to lend a friend', 'The fastest way to start an argument about money'],
  },
  {
    id: 'm12', mode: 'chaos', tags: ['money', 'value'], spice: 2, cats: ['money', 'unhinged'],
    a: 'A terrible investment',
    b: 'A terrible gift',
    decoys: ['A terrible thing to spend savings on', 'A terrible way to lose money'],
  },
  {
    id: 'm13', mode: 'classic', tags: ['money', 'travel'], spice: 2, cats: ['money', 'everyday'],
    a: 'Something that is always a rip-off at an airport',
    b: 'Something that is always a rip-off at a stadium',
    decoys: ['Something that is always a rip-off at a hotel', 'Something you should never buy while travelling'],
  },
  {
    id: 'm14', mode: 'classic', type: 'reverse', tags: ['money'], spice: 2, cats: ['money', 'everyday'],
    a: 'The best thing to spend money on',
    b: 'The worst thing to spend money on',
    decoys: ['The strangest thing to spend money on', 'The thing people spend the most on'],
  },
  {
    // Not FOOD: "a free meal" is incidental, the pair is about what money buys.
    id: 'm15', mode: 'afterdark', tags: ['money', 'moral'], spice: 3, cats: ['money', 'unhinged'],
    a: 'Something you would do for ten thousand dollars',
    b: 'Something you would do for a free meal',
    decoys: ['Something you would do on a dare', 'Something you would do to win an argument'],
  },
];

/**
 * Categories offered in the lobby. Pick any combination, or none for random.
 *
 * Six are topics. Two are tones: UNHINGED is the loud end of the library, and
 * CLEAN is a filter rather than a subject — see `poolForCategories`.
 */
export const CATEGORIES = [
  { id: 'everyday', label: 'EVERYDAY', blurb: 'Normal life, universally funny.', emoji: '🌍' },
  { id: 'dating', label: 'DATING', blurb: 'First dates, red flags, exes.', emoji: '💘' },
  { id: 'food', label: 'FOOD', blurb: 'Orders, snacks, fridge crimes.', emoji: '🍕' },
  { id: 'friends', label: 'FRIENDS', blurb: 'The answers are each other.', emoji: '🫂' },
  { id: 'party', label: 'PARTY', blurb: 'Nights out and 3am decisions.', emoji: '🎉' },
  { id: 'money', label: 'MONEY', blurb: 'Spending, splitting, regretting.', emoji: '💸' },
  { id: 'unhinged', label: 'UNHINGED', blurb: 'Absurd and a little feral.', emoji: '🌀' },
  { id: 'clean', label: 'CLEAN', blurb: 'Keeps everything family-safe.', emoji: '🧼' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const CATEGORY_SET = new Set(CATEGORY_IDS);

/** Below this, a pool can't fill a game without obvious repeats. */
const MIN_POOL = 12;

/** Only these are ever handed out for a `personal` pair — they need real names. */
export const isPersonal = (p) => !!p.personal;

/**
 * Pairs eligible for a selection of categories.
 *
 * No selection means random — the whole library. CLEAN is deliberately not a
 * topic: on its own it's the family-safe library, and alongside topics it
 * narrows them rather than adding spice back in. A table that ticks CLEAN means
 * it, so it stays a hard constraint even when the result is thin.
 */
export function poolForCategories(cats) {
  const sel = (Array.isArray(cats) ? cats : []).filter((c) => CATEGORY_SET.has(c));
  if (!sel.length) return PAIRS;

  const clean = sel.includes('clean');
  const topics = sel.filter((c) => c !== 'clean');

  let pool = topics.length ? PAIRS.filter((p) => p.cats.some((c) => topics.includes(c))) : PAIRS;
  if (clean) pool = pool.filter((p) => p.cats.includes('clean'));

  // Too thin to play? Widen the topics, never the clean constraint.
  if (pool.length < MIN_POOL) {
    pool = clean ? PAIRS.filter((p) => p.cats.includes('clean')) : PAIRS;
  }
  return pool;
}

/** How many pairs a selection would actually draw from — shown in the lobby. */
export const poolSize = (cats) => poolForCategories(cats).length;

/** Build the 3 options for the odd player's bonus guess. Correct answer is `pair.a`. */
export function guessOptionsFor(pair, rng) {
  const opts = new Set([pair.a]);
  for (const d of pair.decoys || []) opts.add(d);
  // Fallback: borrow plausible questions from same-tag pairs.
  if (opts.size < 3) {
    const sameTag = PAIRS.filter(
      (p) => p.id !== pair.id && p.tags?.some((t) => pair.tags?.includes(t))
    );
    const pool = sameTag.length ? sameTag : PAIRS.filter((p) => p.id !== pair.id);
    while (opts.size < 3 && pool.length) {
      const p = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      opts.add(p.a);
    }
  }
  const list = [...opts].slice(0, 3);
  // shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { options: list, correctIndex: list.indexOf(pair.a) };
}
