import { z } from "zod";

const allowedSocialHosts = {
  telegram: new Set([
    "t.me",
    "telegram.me",
  ]),
  instagram: new Set([
    "instagram.com",
    "instagr.am",
  ]),
};

function hasSingleSchemeDelimiter(value: string): boolean {
  const firstDelimiter = value.indexOf("://");
  return firstDelimiter !== -1 && firstDelimiter === value.lastIndexOf("://");
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => {
      const url = parseUrl(value);
      return Boolean(
        url &&
          (url.protocol === "http:" || url.protocol === "https:") &&
          hasSingleSchemeDelimiter(value),
      );
    },
    { message: "Enter a valid URL" },
  );

const httpsUrlSchema = httpUrlSchema.refine(
  (value) => parseUrl(value)?.protocol === "https:",
  { message: "Enter an HTTPS URL" },
);

function createSocialUrlSchema(hostnames: Set<string>) {
  return httpUrlSchema.refine(
    (value) => {
      const url = parseUrl(value);
      const hostname = url?.hostname.toLowerCase().replace(/^www\./, "");
      return Boolean(hostname && hostnames.has(hostname));
    },
  );
}

const telegramUrlSchema = createSocialUrlSchema(allowedSocialHosts.telegram);
const instagramUrlSchema = createSocialUrlSchema(allowedSocialHosts.instagram);

export function normalizeHttpUrl(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getValidationError(
  schema: z.ZodType<string>,
  value: string,
  message: string,
): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : message;
}

export function getHttpsUrlError(value: string): string | undefined {
  return getValidationError(httpsUrlSchema, value, "Enter an HTTPS URL");
}

export function getTelegramUrlError(value: string): string | undefined {
  return getValidationError(telegramUrlSchema, value, "Enter a Telegram URL");
}

export function getInstagramUrlError(value: string): string | undefined {
  return getValidationError(instagramUrlSchema, value, "Enter an Instagram URL");
}
