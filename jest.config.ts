import fs from 'fs'
import type { Config } from 'jest'
import path from 'path'
import { workspaces } from './package.json'

const config: Config = {
  projects: workspaces
    .filter((workspace) => {
      const packageJSONFilePath = path.join(path.dirname(__filename), workspace, 'package.json')
      const packageJSON = JSON.parse(fs.readFileSync(packageJSONFilePath).toString())

      return packageJSON.scripts?.test
    })
    .map((workspace) => `<rootDir>/${workspace}`),
}

export default config
