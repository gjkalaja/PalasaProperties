import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "lang";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "en" ? "en" : "sq";
}

export async function getT() {
  const locale = await getLocale();
  return { t: dictionaries[locale], locale };
}

export { fmt } from "./text";
