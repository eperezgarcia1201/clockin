import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const toEmail = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/\.+/g, ".")}` +
  "@clockin.local";

async function main() {
  const tenantAuthId = process.env.SEED_TENANT_AUTH_ID || "dev-tenant";
  const tenantName = process.env.SEED_TENANT_NAME || "ClockIn Demo";
  const tenantSlug = process.env.SEED_TENANT_SLUG || "clockin-demo";
  const superUserAuthId = process.env.SEED_SUPER_USER_ID || "dev-user";
  const superUserEmail =
    process.env.SEED_SUPER_USER_EMAIL || "dev@clockin.local";
  const superUserName = process.env.SEED_SUPER_USER_NAME || "Super User";
  const superUserRoleValue = process.env.SEED_SUPER_USER_ROLE || "OWNER";
  const superUserRole = Object.values(Role).includes(
    superUserRoleValue as Role,
  )
    ? (superUserRoleValue as Role)
    : Role.OWNER;

  const tenant = await prisma.tenant.upsert({
    where: { authOrgId: tenantAuthId },
    update: { name: tenantName, slug: tenantSlug },
    create: {
      authOrgId: tenantAuthId,
      name: tenantName,
      slug: tenantSlug,
    },
  });

  const superUser = await prisma.user.upsert({
    where: { authUserId: superUserAuthId },
    update: {
      email: superUserEmail,
      name: superUserName,
    },
    create: {
      authUserId: superUserAuthId,
      email: superUserEmail,
      name: superUserName,
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: superUser.id,
      },
    },
    update: { role: superUserRole },
    create: {
      tenantId: tenant.id,
      userId: superUser.id,
      role: superUserRole,
    },
  });

  const officeNames = ["MayaOfdepere", "Downtown"];
  const offices = new Map<string, string>();
  for (const name of officeNames) {
    const office = await prisma.office.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
      },
    });
    offices.set(name, office.id);
  }

  const groupDefinitions = [
    { name: "managers", officeName: "MayaOfdepere" },
    { name: "Cooks", officeName: "MayaOfdepere" },
    { name: "Servers", officeName: "MayaOfdepere" },
  ];

  const groups = new Map<string, string>();
  for (const group of groupDefinitions) {
    const groupRecord = await prisma.group.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: group.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: group.name,
        officeId: offices.get(group.officeName) || null,
      },
    });
    groups.set(group.name, groupRecord.id);
  }

  const statuses = [
    { label: "IN", color: "#1f7a3d", isIn: true },
    { label: "OUT", color: "#b23c2a", isIn: false },
    { label: "BREAK", color: "#f0a202", isIn: false },
    { label: "LUNCH", color: "#4a6fa5", isIn: false },
  ];

  for (const status of statuses) {
    await prisma.punchStatus.upsert({
      where: { tenantId_label: { tenantId: tenant.id, label: status.label } },
      update: {
        color: status.color,
        isIn: status.isIn,
      },
      create: {
        tenantId: tenant.id,
        label: status.label,
        color: status.color,
        isIn: status.isIn,
      },
    });
  }

  type SeedEmployee = {
    fullName: string;
    group: string;
    pin: string;
    hourlyRate: number;
    isAdmin?: boolean;
    isTimeAdmin?: boolean;
    isReports?: boolean;
  };

  const employees: SeedEmployee[] = [
    {
      fullName: "Ana Lopez",
      group: "Servers",
      pin: "4821",
      hourlyRate: 18.5,
      isAdmin: true,
    },
    { fullName: "Brandon Ruiz", group: "Cooks", pin: "7390", hourlyRate: 16 },
    {
      fullName: "Carla Vega",
      group: "Servers",
      pin: "1605",
      hourlyRate: 17.25,
      isTimeAdmin: true,
    },
    {
      fullName: "Diego Torres",
      group: "Cooks",
      pin: "2754",
      hourlyRate: 19,
      isReports: true,
    },
  ];

  for (const employee of employees) {
    const existing = await prisma.employee.findFirst({
      where: { tenantId: tenant.id, fullName: employee.fullName },
    });

    if (existing) {
      continue;
    }

    const pinHash = await hash(employee.pin, 10);

    await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        fullName: employee.fullName,
        displayName: employee.fullName,
        email: toEmail(employee.fullName),
        pinHash,
        hourlyRate: employee.hourlyRate,
        officeId: offices.get("MayaOfdepere") || null,
        groupId: groups.get(employee.group) || null,
        isAdmin: employee.isAdmin ?? false,
        isTimeAdmin: employee.isTimeAdmin ?? false,
        isReports: employee.isReports ?? false,
        disabled: false,
      },
    });

    console.log(`Seeded ${employee.fullName} PIN: ${employee.pin}`);
  }

  console.log("Seed data applied.");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
