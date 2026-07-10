import { prisma } from "@/lib/prisma";

export interface CreatePatientInput {
  name: string;
  gender?: string;
  age?: number | null;
  phone?: string | null;
}

export interface UpdatePatientInput {
  name?: string;
  gender?: string;
  age?: number | null;
  phone?: string | null;
}

export async function listPatients() {
  return prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getPatientById(id: number) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      prescriptions: {
        include: {
          items: {
            select: {
              id: true,
              herbId: true,
              herbName: true,
              grams: true,
              unitPrice: true,
              unitCost: true,
              herb: { select: { name: true } },
            },
          },
          followUps: {
            select: { id: true, evaluation: true, note: true, createdAt: true },
            orderBy: { createdAt: "desc" as const },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
  });
}

export async function createPatient(input: CreatePatientInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.patient.findUnique({ where: { name: input.name } });
    if (existing) return { existingPatient: existing };

    return tx.patient.create({
      data: {
        name: input.name,
        gender: input.gender || "男",
        age: input.age ?? null,
        phone: input.phone ?? null,
      },
    });
  });
}

export async function updatePatient(id: number, input: UpdatePatientInput) {
  return prisma.patient.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.age !== undefined && { age: input.age }),
      ...(input.phone !== undefined && { phone: input.phone }),
    },
  });
}

export async function deletePatient(id: number) {
  return prisma.patient.delete({ where: { id } });
}

export async function deleteAllPatients() {
  const result = await prisma.patient.deleteMany();
  return result.count;
}
