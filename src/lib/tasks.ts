import { generateSecureToken } from "@/lib/tokens";

export const TASK_CATEGORIES = [
  "Cleaning",
  "Handyman",
  "Moving & Delivery",
  "Yard Work",
  "Furniture Assembly",
  "Other",
] as const;

export const TASK_URGENCIES = [
  { value: "asap", label: "ASAP" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "flexible", label: "Flexible" },
] as const;

const URGENCY_VALUES: readonly string[] = TASK_URGENCIES.map((u) => u.value);

/** Unguessable, so it can act as the sole credential for managing a task. */
export const generateMagicToken = generateSecureToken;

export type TaskInput = {
  name: string;
  email: string;
  phone: string | null;
  category: string;
  urgency: string;
  location: string;
  budget: number;
  description: string | null;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits, plus separators people actually type: spaces, dots, dashes, brackets. */
const PHONE_PATTERN = /^[+]?[\d\s().-]+$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type FieldValidator = (value: unknown, errors: Record<string, string>) => unknown;

const validators: Record<keyof TaskInput, FieldValidator> = {
  name: (value, errors) => {
    const name = asString(value);
    if (name.length < 2) errors.name = "Please enter your name.";
    else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";
    return name;
  },
  email: (value, errors) => {
    const email = asString(value).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) errors.email = "Please enter a valid email address.";
    return email;
  },
  // Optional. Kept as the client typed it — formatting is a display concern,
  // and normalizing risks mangling extensions or international numbers.
  phone: (value, errors) => {
    if (value === null || value === undefined || asString(value) === "") return null;
    const phone = asString(value);
    const digits = phone.replace(/\D/g, "").length;

    if (!PHONE_PATTERN.test(phone)) {
      errors.phone = "Please enter a phone number using digits only.";
    } else if (digits < 10) {
      errors.phone = "Please enter a phone number with at least 10 digits.";
    } else if (digits > 15) {
      errors.phone = "That phone number looks too long.";
    }
    return phone;
  },
  category: (value, errors) => {
    const category = asString(value);
    if (!TASK_CATEGORIES.includes(category as (typeof TASK_CATEGORIES)[number])) {
      errors.category = "Please choose a category.";
    }
    return category;
  },
  urgency: (value, errors) => {
    const urgency = asString(value);
    if (!URGENCY_VALUES.includes(urgency)) errors.urgency = "Please choose how urgent this is.";
    return urgency;
  },
  location: (value, errors) => {
    const location = asString(value);
    if (location.length < 2) errors.location = "Please enter a location.";
    else if (location.length > 200) errors.location = "Location must be 200 characters or fewer.";
    return location;
  },
  budget: (value, errors) => {
    const budget = typeof value === "string" ? Number(value.trim()) : value;
    if (typeof budget !== "number" || !Number.isFinite(budget)) {
      errors.budget = "Please enter a budget.";
    } else if (budget <= 0) {
      errors.budget = "Budget must be greater than zero.";
    } else if (budget > 1_000_000) {
      errors.budget = "Budget must be 1,000,000 or less.";
    }
    return typeof budget === "number" && Number.isFinite(budget)
      ? Math.round(budget * 100) / 100
      : budget;
  },
  description: (value, errors) => {
    if (value === null || value === undefined || asString(value) === "") return null;
    const description = asString(value);
    if (description.length > 2000) {
      errors.description = "Description must be 2000 characters or fewer.";
    }
    return description;
  },
};

/** Fields a client may change later via their magic link. Email is fixed: it's where the link was sent. */
export const EDITABLE_TASK_FIELDS = [
  "name",
  "phone",
  "category",
  "urgency",
  "location",
  "budget",
  "description",
] as const satisfies readonly (keyof TaskInput)[];

export function validateTaskInput(body: unknown): ValidationResult<TaskInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: { _: "Expected a JSON object." } };
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const data = {} as Record<string, unknown>;

  for (const [field, validate] of Object.entries(validators)) {
    data[field] = validate(input[field], errors);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as TaskInput };
}

/** Validates only the editable fields that are actually present in the body. */
export function validateTaskUpdate(
  body: unknown,
): ValidationResult<Partial<Pick<TaskInput, (typeof EDITABLE_TASK_FIELDS)[number]>>> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: { _: "Expected a JSON object." } };
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const data = {} as Record<string, unknown>;

  for (const field of EDITABLE_TASK_FIELDS) {
    if (!(field in input)) continue;
    data[field] = validators[field](input[field], errors);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(data).length === 0) {
    return { ok: false, errors: { _: "No editable fields provided." } };
  }
  return { ok: true, data };
}

type TaskRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  urgency: string;
  location: string;
  budget: unknown;
  description: string | null;
  status: string;
  magicToken: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type SerializedTask = Omit<
  TaskRow,
  "budget" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  budget: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** Prisma returns Decimal/Date objects; make them JSON-friendly and stable for clients. */
export function serializeTask(task: TaskRow): SerializedTask {
  return {
    ...task,
    budget: Number(task.budget),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt ? task.deletedAt.toISOString() : null,
  };
}

export function urgencyLabel(value: string): string {
  return TASK_URGENCIES.find((u) => u.value === value)?.label ?? value;
}

/** Words of a description shown to taskers before they unlock a task. */
export const TASK_PREVIEW_WORDS = 25;

/**
 * Tokens charged to reveal a task's contact details. Phase 4 must debit this
 * same constant so the button label can't drift from what's actually spent.
 */
export const UNLOCK_TOKEN_COST = 1;

/**
 * Trims text to a word count, appending an ellipsis when anything was cut.
 * Applied on the server so the untruncated text never reaches the browser.
 */
export function truncateWords(
  text: string | null,
  maxWords = TASK_PREVIEW_WORDS,
): string | null {
  if (!text) return null;

  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return words.join(" ");

  return `${words.slice(0, maxWords).join(" ")}…`;
}

export const CONTACT_PLACEHOLDER = "[hidden]";

/** TLD is letters-only so trailing punctuation ("…@example.com, and") isn't swallowed. */
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/g;
/** Digit runs with common separators; the digit-count check below filters these down. */
const PHONE_LIKE = /\+?\d[\d\s().-]{7,}\d/g;

export type RedactedContact = "phone" | "email";

/**
 * Removes contact details a client typed into free text. Taskers pay to unlock
 * contact info, so leaving a phone number in a description would let them route
 * around the unlock entirely.
 *
 * This is a deterrent, not a guarantee — "four one six..." style evasion still
 * gets through. Deliberately conservative: a candidate is only treated as a
 * phone number when it holds 10-15 digits, so budgets and measurements
 * ("1200 - 1500", "12 x 24 ft") survive untouched.
 */
export function redactContactInfo(text: string | null): {
  text: string | null;
  removed: RedactedContact[];
} {
  if (!text) return { text, removed: [] };

  const removed = new Set<RedactedContact>();

  // Emails first: an address can contain long digit runs that look phone-ish.
  let result = text.replace(EMAIL_LIKE, () => {
    removed.add("email");
    return CONTACT_PLACEHOLDER;
  });

  result = result.replace(PHONE_LIKE, (match) => {
    const digits = match.replace(/\D/g, "").length;
    if (digits < 10 || digits > 15) return match;
    removed.add("phone");
    return CONTACT_PLACEHOLDER;
  });

  return { text: result, removed: [...removed] };
}

/** User-facing explanation of what `redactContactInfo` took out, if anything. */
export function contactWarning(removed: RedactedContact[]): string | null {
  if (removed.length === 0) return null;

  const what =
    removed.length === 2
      ? "a phone number and an email address"
      : removed[0] === "phone"
        ? "a phone number"
        : "an email address";

  return `We removed ${what} from your description. Taskers receive your contact details when they unlock your task.`;
}
