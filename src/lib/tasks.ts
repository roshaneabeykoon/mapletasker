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

/**
 * 32 random bytes as URL-safe base64 (43 chars). Unguessable, so it can act as
 * the sole credential for managing a task. Uses Web Crypto so this module stays
 * importable from client components (which need the field constants below).
 */
export function generateMagicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type TaskInput = {
  name: string;
  email: string;
  category: string;
  urgency: string;
  location: string;
  budget: number;
  description: string | null;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
