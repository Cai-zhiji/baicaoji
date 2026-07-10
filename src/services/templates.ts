import { prisma } from "@/lib/prisma";

const templateInclude = {
  items: {
    include: { herb: { select: { id: true as const, name: true as const } } },
  },
};

/** 序列化模版为前端 DTO */
function toDTO(
  t: Awaited<ReturnType<typeof prisma.template.findFirst<{ include: typeof templateInclude }>>>,
) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    items: t.items.map((ti) => ({
      herbId: ti.herbId,
      herbName: ti.herb.name,
      grams: ti.grams,
    })),
  };
}

export async function listTemplates() {
  const templates = await prisma.template.findMany({
    include: templateInclude,
    orderBy: { createdAt: "desc" as const },
  });
  return templates.map((t) => toDTO(t)!);
}

export async function createTemplate(
  name: string,
  items: { herbId: number; grams?: number }[],
) {
  const template = await prisma.template.create({
    data: {
      name,
      items: {
        create: items.map((item) => ({
          herbId: item.herbId,
          grams: item.grams ?? 0,
        })),
      },
    },
    include: templateInclude,
  });
  return toDTO(template)!;
}

export async function updateTemplate(
  id: number,
  name: string,
  items: { herbId: number; grams?: number }[],
) {
  const template = await prisma.template.update({
    where: { id },
    data: {
      name,
      items: {
        deleteMany: {},
        create: items.map((item) => ({
          herbId: item.herbId,
          grams: item.grams ?? 0,
        })),
      },
    },
    include: templateInclude,
  });
  return toDTO(template)!;
}

export async function deleteTemplate(id: number) {
  await prisma.template.delete({ where: { id } });
}

export async function deleteAllTemplates() {
  const result = await prisma.template.deleteMany();
  return result.count;
}

export async function markTemplateUsed(id: number) {
  await prisma.template.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}
