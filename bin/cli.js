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

program.arguments('<preset...>').action(presets => {
  const devDependencies = []
  const dependencies = []
  const files = []

  presets.forEach(preset => {
    switch (preset) {
      case 'pre-commit':
        devDependencies.push('husky', 'lint-staged')
        files.push('.huskyrc', '.lintstagedrc')
        break
      case 'prettier':
        devDependencies.push('prettier')
        files.push('.prettierrc')
        break
      case 'stylelint':
        devDependencies.push(
          'stylelint',
          'stylelint-config-concentric-order',
          'stylelint-config-prettier',
          'stylelint-config-standard',
          'stylelint-scss'
        )
        files.push('.stylelintrc')
        break
      case 'tslint':
        devDependencies.push('tslint', 'tslint-config-prettier', 'tslint-react')
        files.push('tslint.json')
        break
      default:
    }
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

program.version(packageJson.version)

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

if (process.argv.length === 2) {
  program.help()
}

program.parse(process.argv)
