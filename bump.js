#! /usr/bin/env node

// TODO : we should also expect the command to accept a commit sha which we will tag against, so we don't tag #develop directly (local HEAD may do that anyway, but lets be certain)

/**
 * Written to target node 6.3.0
 * Uses:
 *    Promise
 *    const, let
 *    arrow functions
 */

const argv = require('yargs').argv

const execSync = require('child_process').execSync
const semver = require('semver')

const package_cmd = 'package'
const commands = ['patch', 'minor', 'major', package_cmd]

const exec_options = {
  timeout: 10000,
  // stdio: [0,1,2],
  encoding: 'utf8'
}


/**
 * Will semi-intelligently bump the package.json version and push an associated tag to git
 *
 * Usage:
 *
 *      just patch bump ie. 1.0.99 -> 1.0.100
 *
 *        npm run bump
 *
 *      specify which type of version bump you want
 *
 *        patch: (ie. 1.0.123 -> 1.0.124)
 *        npm run bump -- patch
 *
 *        minor: (ie. 1.2.345-alpha.2 -> 1.3.0)
 *        npm run bump -- minor
 *
 *        major: (ie. 1.234.5 -> 2.0.0)
 *        npm run bump -- major
 *
 *
 *      bump using the tag specified in package.json
 *
 *        npm run bump -- package
 */

/**
 * Uses execSync to run the command passed to it
 * Throws any errors, but prepends the message to provide context
 * @param command
 * @param message
 * @returns {*}
 */
var execSync_handler = (command, message) => {
  try {
    var result = execSync(command, exec_options)
    return result
  }
  catch (err) {
    console.error(message, '------\n', command, '------\n', err)
    throw err
  }
}

/**
 * Bumps the version using the specified command or version
 * @param cmd - can be an 'npm version' command (patch, minor, major) or a valid semver version number
 */
const bump_with_command = (cmd_or_version, commit_sha) => {

  try {

    var head_sha = execSync('git rev-parse HEAD')
    head_sha = head_sha.trim()

    commit_sha = commit_sha || head_sha

    console.log('Finding the current branch')
    var current_branch = execSync('git rev-parse --abbrev-ref HEAD')
    current_branch = current_branch.trim()

    console.log('Resetting git HEAD to point at git commit SHA')
    console.info('git update-ref -m "reset: Reset ' + current_branch + ' to ' + commit_sha + '" refs/heads/' + current_branch + ' ' + commit_sha)
    execSync('git update-ref -m "reset: Reset ' + current_branch + ' to ' + commit_sha + '" refs/heads/' + current_branch + ' ' + commit_sha)


    // TODO: do we need to roll back attempted tag?
    console.log('Attempting to run "npm version ' + cmd_or_version + '"')
    execSync_handler('npm version ' + cmd_or_version + ' -m "' + cmd_or_version + ' bumped tag/version to %s"', 'Could not bump version')

    console.log('Pushing tags to repo...')
    execSync_handler('git push --follow-tags', 'Could not push version and tags to git')

    console.log('Now reset HEAD back to original SHA')
    execSync('git reset --hard ' + head_sha)

    console.info('Success!')
  }
  catch (err) {
    console.error('Error trying to bump version', err)
    throw err
  }

}

/**
 * Returns true if there are any pending additions or commits
 *
 * npm version bump requires a commit and push and therefore has to be run in
 * a git working directory with no pending changes or commits
 * @returns {boolean}
 */
const is_working_directory_dirty = () => {
  let git_status = execSync('git status --untracked-files=no --porcelain', exec_options)
  return (git_status !== null && git_status !== '')
}

/**
 * Bumps the repo version to match the version specified in the package.json
 * BUT first checks the package.json version is valid and greater than repo version
 */
const bump_with_package = (check_pkg_result, commit_sha) => {
  if (check_pkg_result.is_greater) {
    // the package version was acceptable, we'll attempt a bump
    bump_with_command(check_pkg_result.version, commit_sha)
  } else {
    // package version was either invalid semver or not greater than latest repo tag
    console.error(check_pkg_result.message)
  }
}

/**
 * Bumps the repo version by specified command : patch, minor, major
 * BUT first checks updates the local package.json version if required
 */
const bump_repo_version = (check_pkg_result, ver_cmd, commit_sha) => {
  if (!check_pkg_result.is_equal) {
    execSync_handler('npm version from-git', 'Could not fetch latest tag from git')
  }
  bump_with_command(ver_cmd, commit_sha)
}

/**
 *
 * @param ver_cmd
 */
const bump_version = (ver_cmd, commit_sha) => {
  let check_pkg_result = package_version_check(process.env.npm_package_version)

  if (ver_cmd === package_cmd) {
    bump_with_package(check_pkg_result, commit_sha)
  } else {
    bump_repo_version(check_pkg_result, ver_cmd, commit_sha)
  }
}


/**
 * Checks the version provided in the package.json is valid and determines if it both is equal to or greater than latest git tag
 *
 * NOTE :
 * When specifying the required tag in package.json you must use semver. If you want to use pre-release versioning or build metadata
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
const package_version_check = (package_version) => {

  if (!semver.valid(package_version)) {
    return {
      version: null,
      is_greater: false,
      is_equal: false,
      message: 'Version specified in package.json is not valid semver : ' + package_version
    }
  }

  var latest_tag = execSync('git describe --tags --abbrev=0 `git rev-list --tags --max-count=1 --remotes`', exec_options)
  latest_tag = latest_tag.trim()

  let is_greater = semver.gt(package_version, latest_tag)
  let is_equal = semver.eq(package_version, latest_tag)

  return {
    version: package_version,
    is_greater: is_greater,
    is_equal: is_equal
  }
}

// before we run anything we want to check if the git working directory is clean
if (is_working_directory_dirty()) {
  console.error('CANNOT RUN - please commit your pending changes')
  return 0
}

// grab the arguments
console.log(argv._)

if (!argv.sha) {
  console.info('no commit SHA provided, will use latest commit of local git workspace')
}
const commit_sha = argv.sha || null

// if we pass args then only grab the first one, and if no arg then just use 'patch'
const ver_cmd = (argv._ && argv._.length > 0) ? argv._[0] : 'patch'

if (commands.indexOf(ver_cmd) > -1){
  bump_version(ver_cmd, commit_sha)
} else {
  console.error('not a valid command, please choose one of : ', commands)
}

