import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const tenantSlug = 'demo-hanoi';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: 'Công ty Công viên Cây xanh Hà Nội (DEMO)',
      slug: tenantSlug,
      plan: 'pro',
    },
  });

  const passwordHash = await argon2.hash('admin-demo-pass-1234', { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.local',
      fullName: 'Demo Admin',
      passwordHash,
      role: 'OWNER',
    },
  });

  const speciesSeed = [
    { scientificName: 'Khaya senegalensis', commonNameVi: 'Xà cừ', nativeToVN: false, failureProneness: 0.65 },
    { scientificName: 'Delonix regia', commonNameVi: 'Phượng vĩ', nativeToVN: false, failureProneness: 0.7 },
    { scientificName: 'Lagerstroemia speciosa', commonNameVi: 'Bằng lăng', nativeToVN: true, failureProneness: 0.45 },
    { scientificName: 'Dipterocarpus alatus', commonNameVi: 'Dầu rái', nativeToVN: true, failureProneness: 0.3 },
    { scientificName: 'Ficus benjamina', commonNameVi: 'Sanh', nativeToVN: true, failureProneness: 0.4 },
    { scientificName: 'Mangifera indica', commonNameVi: 'Xoài', nativeToVN: true, failureProneness: 0.55 },
  ];

  for (const s of speciesSeed) {
    await prisma.species.upsert({
      where: { tenantId_scientificName: { tenantId: tenant.id, scientificName: s.scientificName } },
      update: {},
      create: { tenantId: tenant.id, ...s },
    });
  }

  const allSpecies = await prisma.species.findMany({ where: { tenantId: tenant.id } });

  const zones = [
    { name: 'Quận Hoàn Kiếm', code: 'HK', district: 'Hoàn Kiếm', province: 'Hà Nội' },
    { name: 'Quận Ba Đình', code: 'BD', district: 'Ba Đình', province: 'Hà Nội' },
    { name: 'Quận Đống Đa', code: 'DD', district: 'Đống Đa', province: 'Hà Nội' },
  ];

  for (const z of zones) {
    await prisma.zone.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: z.code } },
      update: {},
      create: { tenantId: tenant.id, ...z },
    });
  }

  const allZones = await prisma.zone.findMany({ where: { tenantId: tenant.id } });

  // Demo trees scattered around central Hanoi.
  const center = { lng: 105.8542, lat: 21.0285 };
  const existing = await prisma.tree.count({ where: { tenantId: tenant.id } });
  if (existing < 1) {
    const rows: Array<{ lng: number; lat: number; speciesId: string; zoneId: string }> = [];
    for (let i = 0; i < 80; i += 1) {
      const speciesId = allSpecies[i % allSpecies.length]!.id;
      const zoneId = allZones[i % allZones.length]!.id;
      const lng = center.lng + (Math.random() - 0.5) * 0.04;
      const lat = center.lat + (Math.random() - 0.5) * 0.04;
      rows.push({ lng, lat, speciesId, zoneId });
    }
    for (const r of rows) {
      // Raw insert so we can populate the geometry column.
      await prisma.$executeRaw`
        INSERT INTO trees (id, "tenantId", "speciesId", "zoneId", geom, "heightM", "dbhCm",
                           "canopyRadiusM", status, "healthClass", "healthScore", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${tenant.id}::uuid, ${r.speciesId}::uuid, ${r.zoneId}::uuid,
                ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}), 4326),
                ${5 + Math.random() * 15}, ${10 + Math.random() * 40}, ${2 + Math.random() * 6},
                'ALIVE',
                (ARRAY['EXCELLENT','GOOD','FAIR','POOR','CRITICAL'])[1 + floor(random()*5)::int]::"HealthClass",
                ${50 + Math.random() * 50}, NOW(), NOW())
      `;
    }
  }

  console.log(`Seeded tenant ${tenant.slug} with ${allSpecies.length} species and ${allZones.length} zones.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
