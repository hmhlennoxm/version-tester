#! /usr/bin/env node

/**
 * Written to target node 6.3.0
 * Uses:
 *    Promise
 *    const, let
 *    arrow functions
 */

const argv = require('yargs').argv
const exec = require('child_process').exec
const semver = require('semver')

const package_cmd = 'package'
var commands = ['patch', 'minor', 'major', package_cmd]

/**
 * Will semi-intelligently bump the package.json version and push an associated tag to git
 *
 * Usage:
 *
 *      just patch bump ie. 1.0.1 -> 1.0.2
 *
 *        npm run bump
 *
 *      specify which type of version bump you want
 *
 *        patch:
 *        npm run bump -- patch
 *
 *        minor: (ie. 1.2.3 -> 1.3.0)
 *        npm run bump -- minor
 *
 *        major: (ie. 1.2.3 -> 2.0.0)
 *        npm run bump -- major
 *
 *
 *      specify the tag required
 *
 *        npm run bump -- v1.2.4
 *        npm run bump -- v1.3.0-alpha.2
 *
 */

const ver_cmd = argv._ ? argv._[0] : 'patch'

// check is valid command

// check is valid semver
// yes? then check is greater than latest git tag

// pass ver_cmd to bump_version

if (commands.indexOf(ver_cmd) > -1){
  bump_version(ver_cmd)
} else {
  throw new Error('not a valid command, please choose one of : ' + commands)
}


/**
 *
 * @param ver_cmd
 */
const bump_version = (ver_cmd) => {
  // first make sure the package.json is in sync with the git version
  // then bump the version with the requested command, adding a meaningful message
  // push the new version and tag to github

  let sync_tag = ver_cmd !== package_cmd

  if (sync_tag) {
    exec_promise('npm version from-git', { error_message: 'Could not fetch latest tag from git' } )  
  } else {
    
  }

  exec_promise('npm version ' + ver_cmd + ' -m "' + ver_cmd + ' bumped tag/version to %s"', { error_message: 'Could not bump version' })

  exec_promise('git push --follow-tags', { error_message: 'Could not push version and tags to git' } )

}


const exec_promise = (exec_command, options) => {
  return new Promise((resolve, reject) => {
    exec(exec_command, function(error, stdout, stderr) {
      resolve(stdout)
    })
  }).catch((err) => {
    console.log((options.error_message || 'Error'), ':', err)
    throw err;
  })
}


/**
 * NOTE :
 * When specifying the required tag you must use semver. If you want to use pre-release versioning or build metadata
 * please refer to the documentation below
 * 
 *    http://semver.org/#spec-item-9
 *    http://semver.org/#spec-item-10
 *
 * to summarise:
 *    your pre-release tags must be of the form 
 *        1.2.3-{a-z0-9\.}+ ie. 1.2.3-alpha, 1.2.3-alpha.1, 1.2.3-0.3.4
 *    your metadata should be of the form
 *        1.2.3+1.2.3, 1.2.3+zero.sha.1
 *
 * @param requested_version
 */
var verify_package_version = function(requested_version) {
  // pull the latest tag from github
  // ensure that the requested tag is 'larger' than the current one
  // run in tag
}