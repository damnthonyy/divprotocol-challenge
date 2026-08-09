import 'dotenv/config'

import { randomBytes, randomInt } from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'
import { Pool } from 'pg'

/**
 * Seed de demonstration, exige par le livrable : un compte avocat et au moins
 * une demande. Idempotent — `install.sh` peut etre relance sans dupliquer quoi
 * que ce soit ni faire echouer le deploiement.
 *
 * Les identifiants sont ceux que le frontend affiche deja sur l'ecran de
 * connexion (frontend/src/features/auth/login-page.tsx).
 */

const DEMO_EMAIL = 'avocat@divprotocol.com'
const DEMO_PASSWORD = 'demo1234'
const DAY_MS = 86_400_000

function publicToken(): string {
  return randomBytes(6).toString('hex')
}

function pin(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0')
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const lawyer = await prisma.lawyer.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        passwordHash: await argon2.hash(DEMO_PASSWORD),
        name: 'Maitre Rousseau',
        cabinetName: 'Cabinet Rousseau & Associes',
      },
    })

    const existing = await prisma.depositRequest.count({ where: { lawyerId: lawyer.id } })

    if (existing > 0) {
      console.log(`Seed deja en place (${existing} demandes). Rien a faire.`)
      return
    }

    // Trois demandes couvrant les trois statuts : le dashboard est parlant des
    // la premiere connexion, et les trois etats sont verifiables sans manipulation.
    const pendingPin = pin()
    const pending = await prisma.depositRequest.create({
      data: {
        lawyerId: lawyer.id,
        label: 'Dossier Martin, pieces 2026',
        expectedFiles: 4,
        pinHash: await argon2.hash(pendingPin),
        publicToken: publicToken(),
        expiresAt: new Date(Date.now() + 4 * DAY_MS),
      },
    })

    const completePin = pin()
    await prisma.depositRequest.create({
      data: {
        lawyerId: lawyer.id,
        label: 'Succession Lefevre, actes notaries',
        expectedFiles: 1,
        pinHash: await argon2.hash(completePin),
        publicToken: publicToken(),
        expiresAt: new Date(Date.now() + 9 * DAY_MS),
        files: {
          create: {
            filename: 'acte-notarie.pdf',
            size: 5_242_880,
            mimeType: 'application/pdf',
            // Aucun objet correspondant dans le bucket : cette demande sert a
            // peupler le dashboard, pas a tester le telechargement.
            objectKey: 'requests/seed/acte-notarie.pdf',
            checksum: 'seed',
          },
        },
      },
    })

    await prisma.depositRequest.create({
      data: {
        lawyerId: lawyer.id,
        label: 'Contentieux Duval, factures 2025',
        expectedFiles: 6,
        pinHash: await argon2.hash(pin()),
        publicToken: publicToken(),
        expiresAt: new Date(Date.now() - 11 * DAY_MS),
      },
    })

    console.log('\nSeed termine.')
    console.log(`  Avocat      : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
    console.log(`  Lien de test: /d/${pending.publicToken}  (PIN ${pendingPin})`)
    console.log('  Les PIN des autres demandes ne sont pas affiches : ils ne sont pas relisibles.\n')
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
