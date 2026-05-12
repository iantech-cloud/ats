export function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return (
    /^(0|254)(7|1)\d{8}$/.test(cleaned) ||
    /^(7|1)\d{8}$/.test(cleaned)
  );
}
