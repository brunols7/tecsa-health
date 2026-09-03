export function calculateAge(birthDateIso: string, today: Date = new Date()): number {
  const [birthYear, birthMonth, birthDay] = birthDateIso.slice(0, 10).split('-').map(Number);

  let age = today.getFullYear() - birthYear;

  const todayMonth = today.getMonth() + 1;
  const hasNotHadBirthdayYet =
    todayMonth < birthMonth || (todayMonth === birthMonth && today.getDate() < birthDay);

  if (hasNotHadBirthdayYet) {
    age -= 1;
  }

  return age;
}

export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function maskBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join('/');
}

export function brDateToIso(brDate: string): string {
  const [day, month, year] = brDate.split('/');
  return `${year}-${month}-${day}`;
}
