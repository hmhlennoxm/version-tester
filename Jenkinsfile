// corrects a problem with docker plugin
// that creates a new workspace
env.HOME = '/root'

node {

    stage "Checkout"
    checkout scm

    stage "Load utils"
    def utils = load "jenkins_utils.groovy"

    stage "Attempt tag"
    def highest_tag = utils.fetch_highest_tag()
    echo "highest tag : $highest_tag"

}