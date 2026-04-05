import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean slate ─────────────────────────────────────────────────────────────
  await prisma.tenantMember.deleteMany();
  await prisma.clientPortalAccess.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientPortal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("  ✓ Cleared existing data");

  // ── Passwords ────────────────────────────────────────────────────────────────
  const defaultPassword = await hash("password123", 12);

  // ── Tenant 1: Horizon Agency ─────────────────────────────────────────────────
  const horizon = await prisma.tenant.create({
    data: {
      name: "Horizon Agency",
      slug: "horizon-agency",
      primaryColor: "#1B4D6E",
      secondaryColor: "#2E86AB",
      plan: "PROFESSIONAL",
    },
  });

  // Owner
  const alice = await prisma.user.create({
    data: {
      name: "Alice Chen",
      email: "alice@horizon.agency",
      passwordHash: defaultPassword,
    },
  });
  await prisma.tenantMember.create({
    data: { userId: alice.id, tenantId: horizon.id, role: "OWNER" },
  });

  // Editor
  const bob = await prisma.user.create({
    data: {
      name: "Bob Martinez",
      email: "bob@horizon.agency",
      passwordHash: defaultPassword,
    },
  });
  await prisma.tenantMember.create({
    data: { userId: bob.id, tenantId: horizon.id, role: "EDITOR" },
  });

  console.log("  ✓ Tenant 1: Horizon Agency (alice + bob)");

  // ── Tenant 2: Spark Creative ─────────────────────────────────────────────────
  const spark = await prisma.tenant.create({
    data: {
      name: "Spark Creative",
      slug: "spark-creative",
      primaryColor: "#7C3AED",
      secondaryColor: "#A78BFA",
      plan: "STARTER",
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: "Carol Osei",
      email: "carol@sparkcreative.io",
      passwordHash: defaultPassword,
    },
  });
  await prisma.tenantMember.create({
    data: { userId: carol.id, tenantId: spark.id, role: "OWNER" },
  });

  console.log("  ✓ Tenant 2: Spark Creative (carol)");

  // ── Client User ──────────────────────────────────────────────────────────────
  const client = await prisma.user.create({
    data: {
      name: "Dana Whitfield",
      email: "dana@techvision.co",
      passwordHash: defaultPassword,
    },
  });

  console.log("  ✓ Client user: Dana Whitfield");

  // ── Client Portal for Horizon ────────────────────────────────────────────────
  const portal = await prisma.clientPortal.create({
    data: {
      tenantId: horizon.id,
      name: "TechVision Portal",
      slug: "techvision",
      primaryColor: "#0F172A",
      isActive: true,
    },
  });

  await prisma.clientPortalAccess.create({
    data: {
      clientPortalId: portal.id,
      userId: client.id,
      role: "VIEWER",
    },
  });

  console.log("  ✓ Client portal: TechVision");

  // ── Project 1: Brand Redesign ────────────────────────────────────────────────
  const project1 = await prisma.project.create({
    data: {
      tenantId: horizon.id,
      clientPortalId: portal.id,
      name: "Brand Redesign 2024",
      description:
        "Full brand overhaul including logo, colour palette, typography, and brand guidelines.",
      status: "ACTIVE",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-04-30"),
    },
  });

  const m1 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      title: "Discovery & Research",
      dueDate: new Date("2024-02-28"),
      sortOrder: 1,
      isCompleted: true,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      title: "Concept Development",
      dueDate: new Date("2024-03-31"),
      sortOrder: 2,
    },
  });

  // Tasks for milestone 1 (completed)
  await prisma.task.createMany({
    data: [
      {
        projectId: project1.id,
        milestoneId: m1.id,
        title: "Competitor analysis",
        status: "DONE",
        priority: "HIGH",
        assigneeId: alice.id,
        sortOrder: 1,
      },
      {
        projectId: project1.id,
        milestoneId: m1.id,
        title: "Brand audit survey",
        status: "DONE",
        priority: "MEDIUM",
        assigneeId: bob.id,
        sortOrder: 2,
      },
      {
        projectId: project1.id,
        milestoneId: m1.id,
        title: "Client stakeholder interviews",
        status: "DONE",
        priority: "HIGH",
        assigneeId: alice.id,
        sortOrder: 3,
      },
    ],
  });

  // Tasks for milestone 2 (in progress)
  await prisma.task.createMany({
    data: [
      {
        projectId: project1.id,
        milestoneId: m2.id,
        title: "Logo concepts — round 1",
        status: "IN_REVIEW",
        priority: "HIGH",
        assigneeId: bob.id,
        sortOrder: 1,
      },
      {
        projectId: project1.id,
        milestoneId: m2.id,
        title: "Colour palette exploration",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        assigneeId: bob.id,
        sortOrder: 2,
      },
      {
        projectId: project1.id,
        milestoneId: m2.id,
        title: "Typography selection",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: alice.id,
        sortOrder: 3,
      },
    ],
  });

  console.log("  ✓ Project 1: Brand Redesign 2024 (3+3 tasks)");

  // ── Project 2: Website Rebuild ────────────────────────────────────────────────
  const project2 = await prisma.project.create({
    data: {
      tenantId: horizon.id,
      clientPortalId: portal.id,
      name: "Website Rebuild",
      description:
        "Rebuild TechVision's public-facing website using Next.js with a focus on performance and conversion.",
      status: "ACTIVE",
      startDate: new Date("2024-03-15"),
      endDate: new Date("2024-06-30"),
    },
  });

  const m3 = await prisma.milestone.create({
    data: {
      projectId: project2.id,
      title: "Information Architecture",
      dueDate: new Date("2024-04-15"),
      sortOrder: 1,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        projectId: project2.id,
        milestoneId: m3.id,
        title: "Sitemap definition",
        status: "DONE",
        priority: "HIGH",
        assigneeId: alice.id,
        sortOrder: 1,
      },
      {
        projectId: project2.id,
        milestoneId: m3.id,
        title: "Wireframes — homepage",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeId: bob.id,
        sortOrder: 2,
      },
      {
        projectId: project2.id,
        milestoneId: m3.id,
        title: "Wireframes — inner pages",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: bob.id,
        sortOrder: 3,
      },
      {
        projectId: project2.id,
        milestoneId: m3.id,
        title: "Content inventory audit",
        status: "TODO",
        priority: "LOW",
        assigneeId: alice.id,
        sortOrder: 4,
      },
    ],
  });

  console.log("  ✓ Project 2: Website Rebuild (4 tasks)");

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete. Demo credentials (password: password123):");
  console.log("  alice@horizon.agency  — Horizon Owner");
  console.log("  bob@horizon.agency    — Horizon Editor");
  console.log("  carol@sparkcreative.io — Spark Owner");
  console.log("  dana@techvision.co    — Client (TechVision)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
