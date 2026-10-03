import { db } from '../db/db'
import { createDirectory } from './directory'

// The Directory the running app uses. Server-only.
export const directory = createDirectory(db)
