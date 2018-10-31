#!/usr/bin/env node

// Dependencies
const fs = require('fs')
const path = require('path')
const program = require('commander')
const readline = require('readline')
const shell = require('shelljs')

// Paths
const packageJson = require('../package.json')
const ROOT = path.resolve(__dirname, '..')
const CWD = process.cwd()

// Check for a compatible environment
const environmentErrors = checkEnvironment()
if (environmentErrors) {
  console.error(environmentErrors)
  process.exit(1)
}

program
  .arguments('<preset...>')
  .option('-c, --config <cast.json>', 'Config file', path.resolve(ROOT, 'cast.json'))
  .action(presets => {
    const devDependencies = []
    const dependencies = []
    const files = []
    let config

    // Attempt to retrieve the config file
    try {
      config = require(path.resolve(program.config))
    } catch (error) {
      console.error(`Unable to locate '${program.config}'`)
      process.exit(1)
    }

    // Built the dependency and file lists
    presets.forEach(preset => {
      const {
        devDependencies: presetDevDependencies,
        dependencies: presetDependencies,
        files: presetFiles
      } = Object.assign(
        {},
        {
          devDependencies: [],
          dependencies: [],
          files: []
        },
        config.presets[preset]
      )

      devDependencies.push(...presetDevDependencies)
      dependencies.push(...presetDependencies)
      files.push(...presetFiles)
    })

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    // List Packages
    console.log('Packages:')
    ;[...devDependencies, ...dependencies]
      .sort()
      .forEach(package => console.log(`  ${package}`))
    console.log()

    // Install Packages?
    rl.question('Install packages [y/N]? ', packageAnswer => {
      // List Files
      console.log()
      console.log('Files:')
      files.sort().forEach(file => console.log(`  ${file}`))
      console.log()

      // Add Files?
      rl.question('Add configuration files [y/N]? ', fileAnswer => {
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
  .version(packageJson.version)

if (process.argv.length === 2) {
  program.help()
}

program.parse(process.argv)

function checkEnvironment() {
  try {
    fs.accessSync(path.resolve(CWD, 'package.json'))
  } catch (error) {
    return "Unable to locate 'package.json'"
  }

  if (!shell.which('npm')) {
    return "Unable to locate 'npm'"
  }

  return
}

function saidYes(answer) {
  return /y/i.test(answer)
}

function installPackages(devDependencies, dependencies) {
  if (devDependencies.length > 0) {
    shell.exec(`npm install --save-dev ${devDependencies.join(' ')}`)
  }

  if (dependencies.length > 0) {
    shell.exec(`npm install --save ${dependencies.join(' ')}`)
  }
}

function addFiles(files) {
  shell.cp('-n', files.map(file => path.resolve(ROOT, file)), CWD)
}
