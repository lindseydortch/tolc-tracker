import { config } from 'dotenv'
import { createNeonDb } from '../src/db/neon'
import { createDirectory } from '../src/directory/directory'
import { starterCatalogs } from '../src/directory/starter-catalogs'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local.')
}

const directory = createDirectory(createNeonDb(databaseUrl))
await directory.seedCatalogs(starterCatalogs)
const skills = await directory.skillCatalog()
const roles = await directory.roleCatalog()
console.log(`Catalogs seeded: ${skills.length} Skills, ${roles.length} Target Roles`)
process.exit(0)
