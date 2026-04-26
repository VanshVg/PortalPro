import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean slate ─────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.deliverableRevision.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.messageAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientPortalAccess.deleteMany();
  await prisma.clientPortal.deleteMany();
  await prisma.tenantMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("  ✓ Cleared existing data");

  // ── Passwords ────────────────────────────────────────────────────────────────
  const pw = await hash("demo1234", 12);

  // ── Tenant 1: Horizon Agency ─────────────────────────────────────────────────
  const horizon = await prisma.tenant.create({
    data: {
      name: "Horizon Agency",
      slug: "horizon",
      primaryColor: "#1B4D6E",
      secondaryColor: "#2E86AB",
      plan: "PROFESSIONAL",
    },
  });

  const alice = await prisma.user.create({
    data: { name: "Alice Chen", email: "alice@horizon.agency", passwordHash: pw },
  });
  await prisma.tenantMember.create({
    data: { userId: alice.id, tenantId: horizon.id, role: "OWNER" },
  });

  const bob = await prisma.user.create({
    data: { name: "Bob Martinez", email: "bob@horizon.agency", passwordHash: pw },
  });
  await prisma.tenantMember.create({
    data: { userId: bob.id, tenantId: horizon.id, role: "EDITOR" },
  });

  console.log("  ✓ Tenant 1: Horizon Agency (alice + bob)");

  // ── Tenant 2: Spark Creative ─────────────────────────────────────────────────
  const spark = await prisma.tenant.create({
    data: {
      name: "Spark Creative",
      slug: "spark",
      primaryColor: "#7C3AED",
      secondaryColor: "#A78BFA",
      plan: "STARTER",
    },
  });

  const carol = await prisma.user.create({
    data: { name: "Carol Osei", email: "carol@sparkcreative.io", passwordHash: pw },
  });
  await prisma.tenantMember.create({
    data: { userId: carol.id, tenantId: spark.id, role: "OWNER" },
  });

  console.log("  ✓ Tenant 2: Spark Creative (carol)");

  // ── Client Users ─────────────────────────────────────────────────────────────
  const dana = await prisma.user.create({
    data: { name: "Dana Whitfield", email: "dana@techvision.co", passwordHash: pw },
  });
  const maya = await prisma.user.create({
    data: { name: "Maya Patel", email: "maya@techvision.co", passwordHash: pw },
  });

  console.log("  ✓ Client users: Dana Whitfield, Maya Patel");

  // ── Client Portal for Horizon ─────────────────────────────────────────────────
  const portal = await prisma.clientPortal.create({
    data: {
      tenantId: horizon.id,
      name: "TechVision Portal",
      slug: "techvision",
      primaryColor: "#0F172A",
      isActive: true,
    },
  });

  await prisma.clientPortalAccess.createMany({
    data: [
      { clientPortalId: portal.id, userId: dana.id, role: "ADMIN", acceptedAt: new Date() },
      { clientPortalId: portal.id, userId: maya.id, role: "VIEWER", acceptedAt: new Date() },
    ],
  });

  console.log("  ✓ Client portal: TechVision (dana + maya)");

  // ─────────────────────────────────────────────────────────────────────────────
  // Project 1: Brand Redesign 2024
  // ─────────────────────────────────────────────────────────────────────────────
  const proj1 = await prisma.project.create({
    data: {
      tenantId: horizon.id,
      clientPortalId: portal.id,
      name: "Brand Redesign 2024",
      description:
        "Full brand overhaul including logo, colour palette, typography, and brand guidelines document.",
      status: "ACTIVE",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-04-30"),
    },
  });

  // Milestones
  const m1 = await prisma.milestone.create({
    data: {
      projectId: proj1.id,
      title: "Discovery & Research",
      dueDate: new Date("2024-02-28"),
      sortOrder: 1,
      isCompleted: true,
    },
  });
  const m2 = await prisma.milestone.create({
    data: {
      projectId: proj1.id,
      title: "Concept Development",
      dueDate: new Date("2024-03-31"),
      sortOrder: 2,
    },
  });
  const m3 = await prisma.milestone.create({
    data: {
      projectId: proj1.id,
      title: "Refinement & Delivery",
      dueDate: new Date("2024-04-30"),
      sortOrder: 3,
    },
  });

  // Tasks — milestone 1 (all DONE)
  const t1 = await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m1.id,
      title: "Competitor analysis",
      description: "Analyse top 10 competitors across brand identity, tone, and digital presence.",
      status: "DONE",
      priority: "HIGH",
      assigneeId: alice.id,
      dueDate: new Date("2024-02-15"),
      sortOrder: 1,
    },
  });
  const t2 = await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m1.id,
      title: "Brand audit survey",
      description: "Survey internal stakeholders and existing clients on current brand perception.",
      status: "DONE",
      priority: "MEDIUM",
      assigneeId: bob.id,
      dueDate: new Date("2024-02-20"),
      sortOrder: 2,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m1.id,
      title: "Client stakeholder interviews",
      status: "DONE",
      priority: "HIGH",
      assigneeId: alice.id,
      dueDate: new Date("2024-02-28"),
      sortOrder: 3,
    },
  });

  // Tasks — milestone 2 (in progress)
  const t4 = await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m2.id,
      title: "Logo concepts — round 1",
      description: "Create 3 distinct logo concepts based on the discovery findings.",
      status: "IN_REVIEW",
      priority: "URGENT",
      assigneeId: bob.id,
      dueDate: new Date("2024-03-15"),
      sortOrder: 1,
    },
  });
  const t5 = await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m2.id,
      title: "Colour palette exploration",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assigneeId: bob.id,
      sortOrder: 2,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m2.id,
      title: "Typography selection",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: alice.id,
      sortOrder: 3,
    },
  });

  // Tasks — milestone 3 (not started)
  await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m3.id,
      title: "Logo refinement (selected concept)",
      status: "TODO",
      priority: "HIGH",
      assigneeId: bob.id,
      sortOrder: 1,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj1.id,
      milestoneId: m3.id,
      title: "Brand guidelines document",
      status: "TODO",
      priority: "HIGH",
      assigneeId: alice.id,
      sortOrder: 2,
    },
  });

  console.log("  ✓ Project 1: Brand Redesign 2024 (8 tasks, 3 milestones)");

  // Comments
  await prisma.comment.create({
    data: {
      taskId: t4.id,
      authorId: bob.id,
      content: "Three concepts ready. Concept B uses the navy + gold palette from the brief.",
    },
  });
  await prisma.comment.create({
    data: {
      taskId: t4.id,
      authorId: alice.id,
      content: "Reviewed — concept B is the strongest. Sending to Dana for client sign-off.",
    },
  });
  await prisma.comment.create({
    data: {
      taskId: t2.id,
      authorId: bob.id,
      content: "Survey responses collected (34 participants). Compiling into the audit report now.",
    },
  });

  // Messages
  const msg1 = await prisma.message.create({
    data: {
      projectId: proj1.id,
      authorId: alice.id,
      content:
        "Hi Dana and Maya! Just to kick things off — we've completed the discovery phase. The competitor analysis and stakeholder interviews are done. We'll be sharing the Brand Audit Report for your review by end of this week.",
      isRead: true,
      createdAt: new Date("2024-02-29T09:00:00Z"),
    },
  });
  await prisma.message.create({
    data: {
      projectId: proj1.id,
      authorId: dana.id,
      content: "Brilliant, thanks Alice! Really looking forward to seeing the audit findings. The team here is excited about the rebrand.",
      threadId: msg1.id,
      isRead: true,
      createdAt: new Date("2024-02-29T10:15:00Z"),
    },
  });
  await prisma.message.create({
    data: {
      projectId: proj1.id,
      authorId: bob.id,
      content: "The competitor analysis uncovered some great whitespace — especially around tone of voice. That'll feed nicely into the concept direction.",
      threadId: msg1.id,
      isRead: true,
      createdAt: new Date("2024-02-29T11:00:00Z"),
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      projectId: proj1.id,
      authorId: bob.id,
      content:
        "Logo concepts are ready for your review! We've developed three directions. Concept B (navy + warm gold) felt strongest to us based on the brief, but we'd love your team's input before we proceed.",
      isRead: false,
      createdAt: new Date("2024-03-14T14:30:00Z"),
    },
  });
  await prisma.message.create({
    data: {
      projectId: proj1.id,
      authorId: dana.id,
      content: "Concept B is exactly what we had in mind — that contrast works really well. Can we see a version with slightly lighter gold?",
      threadId: msg2.id,
      isRead: true,
      createdAt: new Date("2024-03-15T09:00:00Z"),
    },
  });

  console.log("  ✓ Project 1: Messages seeded");

  // Deliverables
  const del1 = await prisma.deliverable.create({
    data: {
      projectId: proj1.id,
      title: "Brand Audit Report",
      description: "Comprehensive analysis of current brand, competitor landscape, and strategic recommendations.",
      status: "APPROVED",
      submittedAt: new Date("2024-02-29T12:00:00Z"),
      reviewedAt: new Date("2024-03-01T10:00:00Z"),
      reviewedBy: dana.id,
      sortOrder: 1,
    },
  });
  await prisma.deliverableRevision.createMany({
    data: [
      {
        deliverableId: del1.id,
        fromStatus: "DRAFT",
        toStatus: "SUBMITTED",
        actorId: alice.id,
        createdAt: new Date("2024-02-29T12:00:00Z"),
      },
      {
        deliverableId: del1.id,
        fromStatus: "SUBMITTED",
        toStatus: "APPROVED",
        actorId: dana.id,
        feedback: "Excellent work — very thorough. The competitor insights are particularly valuable.",
        createdAt: new Date("2024-03-01T10:00:00Z"),
      },
    ],
  });

  const del2 = await prisma.deliverable.create({
    data: {
      projectId: proj1.id,
      title: "Logo Concepts — Round 1",
      description: "Three logo concept directions for client selection and feedback.",
      status: "REVISION_REQUESTED",
      submittedAt: new Date("2024-03-14T15:00:00Z"),
      reviewedAt: new Date("2024-03-15T09:30:00Z"),
      reviewedBy: dana.id,
      feedback: "Love concept B overall. Please try the gold slightly lighter (#E8B931 → #F5C842) and also show a version on dark background.",
      sortOrder: 2,
    },
  });
  await prisma.deliverableRevision.createMany({
    data: [
      {
        deliverableId: del2.id,
        fromStatus: "DRAFT",
        toStatus: "SUBMITTED",
        actorId: bob.id,
        createdAt: new Date("2024-03-14T15:00:00Z"),
      },
      {
        deliverableId: del2.id,
        fromStatus: "SUBMITTED",
        toStatus: "REVISION_REQUESTED",
        actorId: dana.id,
        feedback: "Love concept B overall. Please try the gold slightly lighter and show a dark background version.",
        createdAt: new Date("2024-03-15T09:30:00Z"),
      },
    ],
  });

  await prisma.deliverable.create({
    data: {
      projectId: proj1.id,
      title: "Final Brand Guidelines",
      description: "Complete brand guidelines document covering logo usage, colour, typography, photography style, and tone of voice.",
      status: "DRAFT",
      sortOrder: 3,
    },
  });

  console.log("  ✓ Project 1: Deliverables seeded");

  // Time entries
  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: proj1.id,
        taskId: t1.id,
        userId: alice.id,
        description: "Competitor analysis research",
        minutes: 240,
        date: new Date("2024-02-10"),
        billable: true,
      },
      {
        projectId: proj1.id,
        taskId: t1.id,
        userId: alice.id,
        description: "Competitor analysis write-up",
        minutes: 150,
        date: new Date("2024-02-12"),
        billable: true,
      },
      {
        projectId: proj1.id,
        taskId: t2.id,
        userId: bob.id,
        description: "Survey design and distribution",
        minutes: 180,
        date: new Date("2024-02-14"),
        billable: true,
      },
      {
        projectId: proj1.id,
        taskId: t2.id,
        userId: bob.id,
        description: "Compiling survey results",
        minutes: 120,
        date: new Date("2024-02-22"),
        billable: true,
      },
      {
        projectId: proj1.id,
        taskId: t4.id,
        userId: bob.id,
        description: "Logo concept development",
        minutes: 360,
        date: new Date("2024-03-10"),
        billable: true,
      },
      {
        projectId: proj1.id,
        taskId: t5.id,
        userId: bob.id,
        description: "Colour palette research",
        minutes: 90,
        date: new Date("2024-03-16"),
        billable: false,
      },
    ],
  });

  console.log("  ✓ Project 1: Time entries seeded");

  // Invoices for project 1
  await prisma.invoice.create({
    data: {
      tenantId: horizon.id,
      projectId: proj1.id,
      number: "INV-001",
      clientEmail: "dana@techvision.co",
      amount: 3500,
      currency: "GBP",
      status: "PAID",
      dueDate: new Date("2024-03-15"),
      paidAt: new Date("2024-03-10"),
      notes: "Discovery & Research phase — thank you for your prompt payment.",
      lineItems: [
        { description: "Brand strategy & competitor analysis", quantity: 1, unitPrice: 1500, amount: 1500 },
        { description: "Stakeholder interviews (3 sessions)", quantity: 3, unitPrice: 400, amount: 1200 },
        { description: "Brand audit report", quantity: 1, unitPrice: 800, amount: 800 },
      ],
    },
  });

  await prisma.invoice.create({
    data: {
      tenantId: horizon.id,
      projectId: proj1.id,
      number: "INV-002",
      clientEmail: "dana@techvision.co",
      amount: 4500,
      currency: "GBP",
      status: "SENT",
      dueDate: new Date("2024-04-15"),
      notes: "Concept Development phase. Payment due within 30 days.",
      lineItems: [
        { description: "Logo concept development (3 directions)", quantity: 1, unitPrice: 2500, amount: 2500 },
        { description: "Colour palette & typography exploration", quantity: 1, unitPrice: 1200, amount: 1200 },
        { description: "Concept presentation session", quantity: 1, unitPrice: 800, amount: 800 },
      ],
    },
  });

  console.log("  ✓ Project 1: Invoices seeded (PAID + SENT)");

  // ─────────────────────────────────────────────────────────────────────────────
  // Project 2: Website Rebuild
  // ─────────────────────────────────────────────────────────────────────────────
  const proj2 = await prisma.project.create({
    data: {
      tenantId: horizon.id,
      clientPortalId: portal.id,
      name: "Website Rebuild",
      description:
        "Rebuild TechVision's public-facing website using Next.js, focusing on performance, accessibility, and conversion.",
      status: "ACTIVE",
      startDate: new Date("2024-03-15"),
      endDate: new Date("2024-06-30"),
    },
  });

  const m4 = await prisma.milestone.create({
    data: {
      projectId: proj2.id,
      title: "Information Architecture",
      dueDate: new Date("2024-04-15"),
      sortOrder: 1,
    },
  });
  const m5 = await prisma.milestone.create({
    data: {
      projectId: proj2.id,
      title: "Design & Prototyping",
      dueDate: new Date("2024-05-15"),
      sortOrder: 2,
    },
  });

  const t6 = await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m4.id,
      title: "Sitemap definition",
      status: "DONE",
      priority: "HIGH",
      assigneeId: alice.id,
      dueDate: new Date("2024-03-25"),
      sortOrder: 1,
    },
  });
  const t7 = await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m4.id,
      title: "Wireframes — homepage",
      description: "High-fidelity wireframes for the homepage including hero, features, and CTA sections.",
      status: "IN_REVIEW",
      priority: "HIGH",
      assigneeId: bob.id,
      dueDate: new Date("2024-04-08"),
      sortOrder: 2,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m4.id,
      title: "Wireframes — inner pages",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assigneeId: bob.id,
      sortOrder: 3,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m4.id,
      title: "Content inventory audit",
      status: "TODO",
      priority: "LOW",
      assigneeId: alice.id,
      sortOrder: 4,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m5.id,
      title: "High-fidelity designs — homepage",
      status: "TODO",
      priority: "HIGH",
      assigneeId: bob.id,
      sortOrder: 1,
    },
  });
  await prisma.task.create({
    data: {
      projectId: proj2.id,
      milestoneId: m5.id,
      title: "Design system documentation",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: alice.id,
      sortOrder: 2,
    },
  });

  console.log("  ✓ Project 2: Website Rebuild (6 tasks, 2 milestones)");

  // Comments
  await prisma.comment.create({
    data: {
      taskId: t7.id,
      authorId: bob.id,
      content: "Homepage wireframes done. Used a full-width hero with animated stats section. Ready for your review.",
    },
  });
  await prisma.comment.create({
    data: {
      taskId: t7.id,
      authorId: alice.id,
      content: "Looks great, Bob. Flagging one thing — the nav needs a mobile breakpoint. Otherwise, ready to share with client.",
    },
  });
  await prisma.comment.create({
    data: {
      taskId: t6.id,
      authorId: alice.id,
      content: "Sitemap approved by the client — 8 top-level pages, blog section, and a resource hub.",
    },
  });

  // Messages
  const msg3 = await prisma.message.create({
    data: {
      projectId: proj2.id,
      authorId: alice.id,
      content:
        "Welcome to the Website Rebuild project, Dana and Maya! We're kicking off with the Information Architecture phase. Bob will have initial wireframes ready by 8 April. Any priority pages you'd like us to focus on first?",
      isRead: true,
      createdAt: new Date("2024-03-18T09:00:00Z"),
    },
  });
  await prisma.message.create({
    data: {
      projectId: proj2.id,
      authorId: maya.id,
      content: "The homepage and the 'Solutions' page are the top priority for us — that's where most of our leads land.",
      threadId: msg3.id,
      isRead: true,
      createdAt: new Date("2024-03-18T11:30:00Z"),
    },
  });

  await prisma.message.create({
    data: {
      projectId: proj2.id,
      authorId: bob.id,
      content:
        "Homepage wireframes are in review. Sharing here for a quick preview before we present formally. Let us know if the navigation structure makes sense from a user perspective.",
      isRead: false,
      createdAt: new Date("2024-04-08T15:00:00Z"),
    },
  });

  console.log("  ✓ Project 2: Messages seeded");

  // Deliverables
  const del4 = await prisma.deliverable.create({
    data: {
      projectId: proj2.id,
      title: "Homepage Wireframes",
      description: "Interactive wireframes for desktop and mobile homepage layout.",
      status: "SUBMITTED",
      submittedAt: new Date("2024-04-08T16:00:00Z"),
      sortOrder: 1,
    },
  });
  await prisma.deliverableRevision.create({
    data: {
      deliverableId: del4.id,
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED",
      actorId: bob.id,
      createdAt: new Date("2024-04-08T16:00:00Z"),
    },
  });

  // Time entries
  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: proj2.id,
        taskId: t6.id,
        userId: alice.id,
        description: "Sitemap workshop with TechVision team",
        minutes: 120,
        date: new Date("2024-03-20"),
        billable: true,
      },
      {
        projectId: proj2.id,
        taskId: t7.id,
        userId: bob.id,
        description: "Homepage wireframe design",
        minutes: 300,
        date: new Date("2024-04-05"),
        billable: true,
      },
      {
        projectId: proj2.id,
        taskId: t7.id,
        userId: bob.id,
        description: "Mobile breakpoint refinements",
        minutes: 90,
        date: new Date("2024-04-07"),
        billable: true,
      },
    ],
  });

  // Invoice
  await prisma.invoice.create({
    data: {
      tenantId: horizon.id,
      projectId: proj2.id,
      number: "INV-003",
      clientEmail: "dana@techvision.co",
      amount: 2000,
      currency: "GBP",
      status: "DRAFT",
      dueDate: new Date("2024-05-01"),
      notes: "Information Architecture phase.",
      lineItems: [
        { description: "Sitemap definition & workshop", quantity: 1, unitPrice: 600, amount: 600 },
        { description: "Homepage wireframes (desktop + mobile)", quantity: 1, unitPrice: 1000, amount: 1000 },
        { description: "Inner page wireframes (4 pages)", quantity: 4, unitPrice: 100, amount: 400 },
      ],
    },
  });

  console.log("  ✓ Project 2: Time entries + draft invoice seeded");

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`
✅ Seed complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Demo Credentials  (password: demo1234 for all)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Agency Dashboard → http://localhost:3000

  alice@horizon.agency   — Horizon Agency Owner
  bob@horizon.agency     — Horizon Agency Editor
  carol@sparkcreative.io — Spark Creative Owner

 Client Portal → http://localhost:3001/horizon/techvision

  dana@techvision.co     — TechVision Portal Admin
  maya@techvision.co     — TechVision Portal Viewer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
