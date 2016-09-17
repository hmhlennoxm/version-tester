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
const commands = ['patch', 'minor', 'major', package_cmd]


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


const exec_promise = (exec_command, options) => {
  return new Promise((resolve, reject) => {
    exec(exec_command, function(error, stdout, stderr) {
      if (error){
        reject(error)
      }
      resolve(error, stdout, stderr)
    })
  })
  .then((data) => {
    console.log('got here', data)
  })
  .catch((err) => {
    console.log((options.error_message || 'Error'), ':', err)
  })
}

/**
 *
 * @param ver_cmd
 */
const bump_version = (ver_cmd) => {

  // TODO : we should also expect the command to accept a commit sha which we will tag against, so we don't tag #develop directly (local HEAD may do that anyway, but lets be certain)

  // first make sure the package.json is in sync with the git version
  // then bump the version with the requested command, adding a meaningful message
  // push the new version and tag to github

  let sync_tag = (ver_cmd !== package_cmd)



  let bump_handler = (cmd) => {
    exec_promise('npm version ' + cmd + ' -m "' + cmd + ' bumped tag/version to %s"', { error_message: 'Could not bump version' })
      .then(exec_promise('git push --follow-tags', { error_message: 'Could not push version and tags to git' } ))  
  }

  console.log('cmd : ', ver_cmd)

  if (sync_tag) {
    console.log('yes, sync_tag if we can')
    package_version_usable(process.env.npm_package_version)
      // .then(() => {
      //   console.log('then hit')
      // })
      // .catch(() => {
      //   console.error('catch hit')
      // })
      // if the local package version matches the latest tag then running 'npm version from-git' throws an error
      .then(() => {
        console.log('then 2 hit')
        exec_promise('npm version from-git', { error_message: 'Could not fetch latest tag from git' } )
      })
      .catch(() => {
        console.error('catch 2 hit')
        bump_handler(ver_cmd)
          .catch((err) => console.log('catch 3 : ', err))
      })
  } else {
    console.log('no, we are providing tag')
    package_version_usable(process.env.npm_package_version)
      .then((package_version) => bump_handler('"' + package_version + '"'))
      .catch((err) => console.log('branch 2 error caught : ', err))
  }


}


/**
 * Checks the version provided in the package.json is valid and exceeds the latest git tag
 *
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
 */
const package_version_usable = function(package_version) {

  return new Promise((resolve, reject) => {

    if (!semver.valid(package_version)){
      reject('Version specified in package.json is not valid semver : ' + package_version)
    }

    exec('git describe --tags --abbrev=0 `git rev-list --tags --max-count=1 --remotes`', (error, latest_tag, stderr) => {
      latest_tag = latest_tag.trim()
        
      let is_usable = semver.gt(package_version, latest_tag)
      console.log('will update and tag git repo from "' + latest_tag + '" to "' + package_version + '"? :', is_usable)

      if (is_usable){
        console.error('it is usable - resolving')
        resolve(package_version)
      } else {
        console.error('it is NOT usable - rejecting!!')
        reject('The proposed version "' + package_version + '" must be greater than the existing latest tag "' + latest_tag + '"')
      }
    })
  })
}

console.log(argv._)

const ver_cmd = (argv._ && argv._.length > 0) ? argv._[0] : 'patch'

if (commands.indexOf(ver_cmd) > -1){
  bump_version(ver_cmd)
} else {
  console.error('not a valid command, please choose one of : ', commands)
}

