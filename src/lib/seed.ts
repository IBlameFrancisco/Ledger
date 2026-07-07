import type { AppState, Task } from "./types";

const base = {
  currentIndex: 0,
  streak: 0,
  best: 0,
  lastDone: null,
  finished: false,
  coach: null
};

export function seed(): AppState {
  const tasks: Task[] = [
    {
      ...base,
      id: "wake",
      cat: "lifestyle",
      name: "Up by 9:00",
      type: "daily",
      minutes: 0,
      time: "9:00",
      note: "Feet on the floor before the second alarm.",
      goal: "Consistent 9:00 wake time every day."
    },
    {
      ...base,
      id: "skinAM",
      cat: "lifestyle",
      name: "Skincare (AM)",
      type: "daily",
      minutes: 5,
      time: "9:05",
      note: "",
      goal: "Morning skincare routine, daily."
    },
    {
      ...base,
      id: "gym",
      cat: "lifestyle",
      name: "Gym",
      type: "rotation",
      minutes: 75,
      time: "9:40",
      goal: "PPL split for strength and hypertrophy alongside climbing.",
      items: [
        { name: "Push", detail: "Bench, OHP, incline DB, lateral raises, triceps" },
        { name: "Pull", detail: "Rows, pull-ups, rear delts, curls" },
        { name: "Legs", detail: "Squat, RDL, leg press, calves, abs" }
      ]
    },
    {
      ...base,
      id: "shower",
      cat: "lifestyle",
      name: "Shower",
      type: "daily",
      minutes: 15,
      time: "11:00",
      note: ""
    },
    {
      ...base,
      id: "skinPM",
      cat: "lifestyle",
      name: "Skincare (PM)",
      type: "daily",
      minutes: 5,
      time: "22:00",
      note: ""
    },
    {
      ...base,
      id: "babbel",
      cat: "streaks",
      name: "Babbel",
      type: "daily",
      minutes: 20,
      time: "11:15",
      note: "One full lesson minimum.",
      goal: "Daily language practice."
    },
    {
      ...base,
      id: "zip",
      cat: "streaks",
      name: "LinkedIn Zip",
      type: "daily",
      minutes: 10,
      time: "11:35",
      note: ""
    },
    {
      ...base,
      id: "chess",
      cat: "streaks",
      name: "Chess",
      type: "daily",
      minutes: 25,
      time: "11:45",
      note: "Puzzles, or one rapid game plus review.",
      goal: "Steady rating climb through daily puzzles and reviewed games."
    },
    {
      ...base,
      id: "cf",
      cat: "streaks",
      name: "Codeforces",
      type: "daily",
      minutes: 35,
      time: "12:10",
      note: "One problem slightly above comfort rating.",
      goal: "One rated problem a day, trending difficulty upward."
    },
    {
      ...base,
      id: "lc",
      cat: "streaks",
      name: "LeetCode",
      type: "rotation",
      minutes: 30,
      time: "12:45",
      goal: "Interview readiness across core topic areas.",
      items: [
        { name: "Arrays / two pointers", detail: "1 medium" },
        { name: "Trees / graphs", detail: "1 medium" },
        { name: "Dynamic programming", detail: "1 medium" }
      ]
    },
    {
      ...base,
      id: "piano",
      cat: "skill",
      name: "Piano",
      type: "sequence",
      minutes: 30,
      time: "17:30",
      goal: "Liebestraum No. 3 to a clean performance tempo.",
      items: [
        { name: "Bars 20-25, hands separate", detail: "Slow, exact fingering" },
        { name: "Bars 20-25, hands together" },
        { name: "Bars 25-30" },
        { name: "Cadenza 1, right hand slow" },
        { name: "Cadenza 1, hands together" },
        { name: "Bars 31-42" },
        { name: "A section run-through at tempo" }
      ]
    },
    {
      ...base,
      id: "clang",
      cat: "skill",
      name: "C",
      type: "sequence",
      minutes: 30,
      time: "18:00",
      goal: "Work through K&R, then small systems projects.",
      items: [
        { name: "K&R ch. 1, tutorial intro" },
        { name: "K&R ch. 2, types and operators" },
        { name: "K&R ch. 3, control flow" },
        { name: "K&R ch. 4, functions and scope" },
        { name: "K&R ch. 5, pointers (part 1)" },
        { name: "K&R ch. 5, pointers (part 2)" },
        { name: "K&R ch. 6, structs" },
        { name: "K&R ch. 7, input and output" },
        { name: "Project: rebuild wc" },
        { name: "Project: dynamic array library" }
      ]
    },
    {
      ...base,
      id: "algos",
      cat: "skill",
      name: "Algorithms review",
      type: "rotation",
      minutes: 45,
      time: "18:30",
      goal: "Keep DP and greedy sharp for coursework and contests.",
      items: [
        { name: "Dynamic programming", detail: "2 problems, then recap notes" },
        { name: "Greedy", detail: "2 problems, recap the exchange argument" },
        { name: "Mixed", detail: "1 DP + 1 greedy, timed" }
      ]
    },
    {
      ...base,
      id: "ml",
      cat: "skill",
      name: "6.3900",
      type: "sequence",
      minutes: 60,
      time: "20:15",
      goal: "Machine learning fundamentals ahead of the term.",
      items: [
        { name: "Intro + linear regression" },
        { name: "Gradient descent" },
        { name: "Classification, logistic regression" },
        { name: "Margins and regularization" },
        { name: "Feature engineering" },
        { name: "Neural networks I" },
        { name: "Neural networks II, backprop" },
        { name: "Convolutional nets" },
        { name: "Sequence models" },
        { name: "Transformers" },
        { name: "Clustering" },
        { name: "RL intro" }
      ]
    },
    {
      ...base,
      id: "workskills",
      cat: "skill",
      name: "Work skills",
      type: "daily",
      minutes: 30,
      time: "21:15",
      note: "Read one module of the pipeline, write a 5-line summary.",
      goal: "Fluency in the research codebase."
    }
  ];

  return {
    tasks,
    todos: [{ id: "td1", text: "Check the results of the evals", done: false }],
    log: {},
    entries: []
  };
}
