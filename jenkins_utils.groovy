import groovy.json.JsonOutput
import java.lang.Exception

def dismay = ["Ah fiddlesticks :(", "ugh :/", "b0rked", "O_o", "Sweet leg of the lamb of jeebus"]
def glee = ["w00t!", "Yay!", "Happy days :)", ":D", "Slick!", "Awesome sauce"]


def find_git_commit() {
  sh "git rev-parse HEAD > commit"
  return readFile('commit').trim()
}

// generates SHA of the dind Dockerfile
def calc_dind_sha() {
  sh "cat bedrock/dind/Dockerfile"
  sh "shasum bedrock/dind/Dockerfile > dind_sha"
  def matches = (readFile('dind_sha').trim() =~ /(.*) .*/)
  def docker_sha = matches[0][1]
  // now we need to null the matches var because...
  // https://github.com/jenkinsci/pipeline-plugin/blob/master/TUTORIAL.md#serializing-local-variables
  matches =  null
  return docker_sha.trim()
}

// returns boolean
// - checks if a tagged version of a container already exists in the docker repo
def check_tag_exists(sha_tag, project_folder, container_name) {
  def matched_tags = ""
  sh "echo `curl https://docker.br.hmheng.io/v2/$project_folder/$container_name/tags/list | grep $sha_tag` > tag_json"
  sh "cat tag_json"
  matched_tags = readFile('tag_json').trim()

  return (matched_tags != "")
}

// prints error and exits, otherwise exactly the same as check_tag_exists
def verify_tag(requested_tag, project_folder, container_name) {
    if (!check_tag_exists(requested_tag, project_folder, container_name)) {
        sh "echo the requested container '$project_folder/$container_name:$requested_tag' does not exist"
        throw new Exception("the requested container '$project_folder/$container_name:$requested_tag' does not exist")
    }
}

// finds the highest semver tag in the current repo
def fetch_highest_tag() {
  sh "git ls-remote --tags | grep -o 'refs/tags/v[0-9]*\\.[0-9]*\\.[0-9]*' | sed -e s#refs/tags/v## | sort -t. -k 1,1n -k 2,2n -k 3,3n -k 4,4n | tail -n 1 | grep -o '[^\\/]*\$' > high_tag"
  def highest_tag = readFile('high_tag').trim()
  sh "echo highest tag found : $highest_tag"
  return highest_tag
}

// TODO : get this feckin thing working
def check_environment(passed_env) {
    String[] environments = ["INT", "CERT", "PROD", "CERTRV", "PRODRV"]
    if (!(environments.contains(passed_env))) {
        sh "echo '$passed_env' IS INVALID - SPECIFY AN ENVIRONMENT MATCHING ONE OF : INT, CERT, CERTRV, PROD, PRODRV"
        throw new Exception('Wrong environment requested')
    }
}

def error_message_to_slack(webhook_url, text, exception, build_url) {
  echo "exception : '$exception'"
  echo "build_url : '$build_url'"
  //def payload = JsonOutput.toJson([text : text, attachments : [{ title : build_url, title_link : build_url }]])
  def payload = JsonOutput.toJson([text : text])
  sh "curl -X POST --data-urlencode \'payload=${payload}\' ${webhook_url}"

  // notify_slack(webhook_url, text)
  throw new Exception(text)

  // {
  //     "attachments": [
  //         {
  //             "fallback": "Required plain-text summary of the attachment.",
  //             "color": "#ff0000",
  //             "pretext": "Optional text that appears above the attachment block",
  //             "author_name": "Bobby Tables",
  //             "author_link": "http://flickr.com/bobby/",
  //             "author_icon": "http://flickr.com/icons/bobby.jpg",
  //             "title": "Slack API Documentation",
  //             "title_link": "https://api.slack.com/",
  //             "text": "Optional text that appears within the attachment",
  //             "fields": [
  //                 {
  //                     "title": "Priority",
  //                     "value": "High",
  //                     "short": false
  //                 }
  //             ],
  //             "image_url": "http://my-website.com/path/to/image.jpg",
  //             "thumb_url": "http://example.com/path/to/thumb.png",
  //             "footer": "Slack API",
  //             "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
  //             "ts": 123456789
  //         }
  //     ]
  // }
}

def notify_slack(webhook_url, text) {
    def payload = JsonOutput.toJson([text      : text])
    sh "curl -X POST --data-urlencode \'payload=${payload}\' ${webhook_url}"
}

// Add whichever params you think you’d most want to have // replace the slackURL below with the hook url provided by // slack when you configure the webhook


// Very important!
return this;