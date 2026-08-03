import {
  loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema,
  createWithdrawalSchema, contactSchema, updateProfileSchema, updateWalletAddressesSchema,
} from "./src/index.ts";

const schemas: Record<string, any> = {
  loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema,
  createWithdrawalSchema, contactSchema, updateProfileSchema, updateWalletAddressesSchema,
};
for (const [name, s] of Object.entries(schemas)) {
  const hasBody = s?.shape && typeof s.shape.body === "object";
  const flatRes = s?.safeParse?.({}) ;
  console.log(name, "| has .shape.body:", hasBody, "| safeParse({}) success:", flatRes?.success ?? "n/a");
}
