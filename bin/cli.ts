#!/usr/bin/env node

// Dependencies
import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import shell from 'shelljs'

// Type Definitions
interface Preset {
  devDependencies: string[]
  dependencies: string[]
  files: string[]
}

interface Config {
  presets: {
    [name: string]: Preset
  }
}

// Paths
const CWD = process.cwd()
const ROOT = path.resolve(__dirname, '..')
const CONFIGS = path.resolve(ROOT, 'configs')

// Command
const program = new Command()

program
  .option(
    '-c, --config <cast.json>',
    'Cast config file',
    path.resolve(ROOT, 'cast.json')
  )
  .arguments('<preset...>')
  .action((args: string[]) => {
    const devDependencies: string[] = []
    const dependencies: string[] = []
    const files: string[] = []
    const configPath = path.resolve(program.config)

    // Check for a compatible environment
    const environmentErrors = validateEnvironment({ configPath })
    if (environmentErrors) {
      console.error(environmentErrors)
      process.exit(1)
    }

    // Build the dependency and file lists from presets
    const { presets } = require(configPath) as Config

    args.forEach((arg) => {
      const preset = presets[arg]

      if (preset) {
        devDependencies.push(...(preset.devDependencies ?? []))
        dependencies.push(...(preset.dependencies ?? []))
        files.push(...(preset.files ?? []))
      }
    })

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // List Packages
    console.log('Packages:')
    ;[...devDependencies, ...dependencies]
      .sort()
      .forEach((packageName) => console.log(`• ${packageName}`))
    console.log()

    // Install Packages?
    rl.question('Install packages [y/N]? ', (packageAnswer) => {
      // List Files
      console.log()
      console.log('Files:')
      files.sort().forEach((file) => console.log(`• ${file}`))
      console.log()

      // Add Files?
      rl.question('Add configuration files [y/N]? ', (fileAnswer) => {
        rl.close()

        if (saidYes(packageAnswer)) {
          installPackages(devDependencies, dependencies)
        }

        if (saidYes(fileAnswer)) {
          addFiles(files)
        }
      })
    })
  })

program.parse(process.argv)

if (program.args.length === 0) program.help()

function validateEnvironment(env: { configPath: string }) {
  try {
    fs.accessSync(env.configPath)
  } catch (error) {
    return `Unable to locate '${program.config}'`
  }

  try {
    fs.accessSync(path.resolve(CWD, 'package.json'))
  } catch (error) {
    return `Unable to locate 'package.json'`
  }

  if (!shell.which('npm')) {
    return `Unable to locate 'npm'`
  }

  return
}

function saidYes(answer: string) {
  return /y/i.test(answer)
}

function installPackages(devDependencies: string[], dependencies: string[]) {
  if (devDependencies.length > 0)
    shell.exec(`npm install --save-dev ${devDependencies.join(' ')}`)

  if (dependencies.length > 0)
    shell.exec(`npm install --save ${dependencies.join(' ')}`)
}

function addFiles(files: Preset['files']) {
  shell.cp(
    '-n',
    files.map((file) => path.resolve(CONFIGS, file)),
    CWD
  )
}
