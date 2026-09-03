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
