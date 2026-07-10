import { prisma } from "@/lib/prisma";

export async function upsertPatientByName(
  name: string,
  gender: string,
  age: number | null,
  phone: string | null
) {
  return prisma.patient.upsert({
    where: { name },
    update: { gender, age, phone },
    create: { name, gender, age, phone },
  });
}
