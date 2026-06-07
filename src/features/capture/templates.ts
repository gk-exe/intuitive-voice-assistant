/**
 * Capture Templates
 * -----------------
 * Tiny set of seed phrases shown under the input. Tapping one fills the
 * input so users discover what natural language they can use without a
 * tutorial.
 */

export interface CaptureTemplate {
  id: string;
  label: string;
  text: string;
  hint: string;
}

export const CAPTURE_TEMPLATES: readonly CaptureTemplate[] = [
  { id: "owe", label: "Money owed", text: "Rajeev owes me 15000", hint: "Finance" },
  { id: "bill", label: "Bill", text: "Electricity bill due on the 15th", hint: "Bill" },
  { id: "buy", label: "Groceries", text: "Buy rice and milk", hint: "Groceries" },
  { id: "call", label: "Reminder", text: "Call Suresh tomorrow", hint: "Task" },
  { id: "property", label: "Property", text: "Kakkanad flat is vacant", hint: "Rent" },
];
