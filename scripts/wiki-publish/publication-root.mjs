import path from 'node:path'

export function publicationRoot(env = process.env, cwd = process.cwd()) {
  const configured = env.PUBLICATION_ROOT?.trim()
  return configured ? path.resolve(cwd, configured) : cwd
}

export function requiredPublicationRoot(env = process.env, cwd = process.cwd()) {
  const configured = env.PUBLICATION_ROOT?.trim()
  if (!configured) throw new Error('PUBLICATION_ROOT is required for publication commands')
  return path.resolve(cwd, configured)
}
