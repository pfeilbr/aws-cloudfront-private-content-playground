#!/usr/bin/env bash

#set -o errexit
#set -o nounset
set -o pipefail
set -o noglob

TEMPLATE="template.yaml"
PACKAGED_TEMPLATE="packaged.yaml"
S3_BUCKET="${S3_SAM_DEPLOY_BUCKET}"
REGION="${REGION:-us-east-1}"
PROVISIONING_STACK_NAME="dev-bootstrap-private-website"
STACK_NAME="dev-private-website"
BARE_DOMAIN_NAME="allthecloudbits"
DOMAIN_NAME="${BARE_DOMAIN_NAME}.com"
STAGING_DOMAIN_NAME="staging.allthecloudbits.com"
API_DOMAIN_NAME="httpbin.org"
AUTOMATION_USER_PASSWORD="automation123"
read -r -d '' TAGS <<- EOM
    Name=tagName \
    Costcenter=tagCostcenter \
    Division=tagDivision \
    Environment=tagEnvironment \
    Application=tagApplication \
    Consumer=tagConsumer
EOM



CONTENT_DIRECTORY_PATH="./public"
BUILD_SOURCEBRANCHNAME="${BUILD_SOURCEBRANCHNAME:-master}"
#BUILD_SOURCEBRANCHNAME="develop"
#BUILD_SOURCEVERSION=$(LC_CTYPE=C tr -dc A-Za-z0-9 < /dev/urandom | fold -w ${1:-32} | head -n 1)
BUILD_SOURCEVERSION="${BUILD_SOURCEVERSION:-v0.0.1}"

display_usage() {
    echo -e "script runner tool\n"
    echo -e "USAGE"
    echo -e "\t$ run [COMMAND]\n"
    echo -e "COMMANDS"
    echo -e "\trun deploy-infrastructure"
    echo -e "\trun describe-stack-outputs"
    echo -e "\trun delete-infrastructure"
    echo -e "\trun publish-content staging|prod [--blue-green-publish] [--apply-routing-rules] [--invalidate-cloudfront-cache]"
    echo -e "\trun tag-and-trigger-publish"
    
}

# if less than two arguments supplied, display usage 
if [  $# -le 0 ] 
then 
    display_usage
    exit 1
fi 
 
# check whether user had supplied -h or --help . If yes display usage 
if [[ ( $# == "--help") ||  $# == "-h" ]] 
then 
    display_usage
    exit 0
fi

PARAMS=""

while (( "$#" )); do
  case "$1" in
    -b|--blue-green-publish)
      BLUE_GREEN_PUBLISH=1
      shift
      ;;
    -r|--apply-routing-rules)
      APPLY_ROUTING_RULES=1
      shift
      ;;
    -i|--invalidate-cloudfront-cache)
      INVALIDATE_CLOUDFRONT_CACHE=1
      shift
      ;;
    -m|--message)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        MESSAGE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;
    -t|--title)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        TITLE=$2
        shift 2
      else
        echo "Error: Argument for $1 is missing" >&2
        exit 1
      fi
      ;;      
    -*|--*=) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      exit 1
      ;;
    *) # preserve positional arguments
      PARAMS="$PARAMS $1"
      shift
      ;;
  esac
done
# set positional arguments in their proper place
eval set -- "$PARAMS"

CMD="${1}"

bootstrap() {
    aws cloudformation deploy \
        --region "${REGION}" \
        --template cfn-templates/provisioning-resources.yaml \
        --stack-name ${PROVISIONING_STACK_NAME} \
        --parameter-overrides ResourcePrefix=${STACK_NAME} \
        --capabilities CAPABILITY_IAM \
        --tags ${TAGS}

    [ -d tmp ] || mkdir tmp
    stack_outputs_file_path="tmp/${PROVISIONING_STACK_NAME}-outputs.json"

    aws cloudformation describe-stacks \
        --region "${REGION}" \
        --stack-name "${PROVISIONING_STACK_NAME}" \
        --query "Stacks[0].Outputs" \
        --output json > "${stack_outputs_file_path}"    
}

deploy-infrastructure() {
    sam package \
        --template-file "${TEMPLATE}" \
        --s3-bucket "${S3_BUCKET}" \
        --output-template-file "${PACKAGED_TEMPLATE}"

    sam deploy \
        --template-file "${PACKAGED_TEMPLATE}" \
        --s3-bucket "${S3_BUCKET}" \
        --region "${REGION}" \
        --stack-name ${STACK_NAME} \
        --parameter-overrides BareDomainName=${BARE_DOMAIN_NAME} DomainName=${DOMAIN_NAME} StagingDomainName=${STAGING_DOMAIN_NAME} ApiDomainName=${API_DOMAIN_NAME} AutomationUserPassword=${AUTOMATION_USER_PASSWORD} \
        --capabilities CAPABILITY_IAM \
        --tags \
            Name=tagName \
            Costcenter=tagCostcenter \
            Division=tagDivision \
            Environment=tagEnvironment \
            Application=tagApplication \
            Consumer=tagConsumer

    [ -d tmp ] || mkdir tmp
    stack_outputs_file_path="tmp/${STACK_NAME}-outputs.json"

    aws cloudformation describe-stacks \
        --region "${REGION}" \
        --stack-name "${STACK_NAME}" \
        --query "Stacks[0].Outputs" \
        --output json > "${stack_outputs_file_path}"

    echo stack outputs written to "${stack_outputs_file_path}"
}

describe-stack-outputs() {
    aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs" --output json | jq '.'
}

delete-infrastructure() {

    website_bucket_name=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
    website_staging_bucket_name=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='StagingWebsiteBucketName'].OutputValue" --output text)
    cloudfront_logs_bucket_name=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" --output text)
    
    aws s3 rb "s3://${website_bucket_name}" --force
    aws s3 rb "s3://${website_staging_bucket_name}" --force
    aws s3 rb "s3://${cloudfront_logs_bucket_name}" --force

    aws cloudformation delete-stack \
        --region "${REGION}" \
        --stack-name "${STACK_NAME}"

    aws cloudformation wait stack-delete-complete \
        --region "${REGION}" \
        --stack-name "${STACK_NAME}"

}


sync_s3() {
  content_directory_path=${1}
  bucket_name=${2}
  tag_name=${3}

  echo -e "Syncing assets..."
  aws s3 sync ${content_directory_path} s3://${bucket_name}/${tag_name} --delete
  echo -e "Done"
}

create_routing_rule() {
    bucket=$1
    prefix=$2
    target=$3
    redirect_location=$4

    aws s3api put-object \
        --bucket "${bucket}" \
        --key "${prefix}${target}" \
        --website-redirect-location "${redirect_location}" \
        --content-length "0"
}

create_routing_rules() {
    bucket=$1
    prefix=$2

    old_ifs=$IFS
    IFS=$'\r\n'
    GLOBIGNORE='*'
    rules=($(cat routing-rules/routing-rules.txt)) 
    echo "rules=${rules[@]}"

    for rule in "${rules[@]}"
    do
        echo "rule=${rule}"
        components=($(echo $rule | tr " " "\r\n"))
        echo "${components[@]}"
        target="${components[0]}"
        echo "target=${target}"
        redirect_location="${components[1]}"
        echo "target=${target}, redirect_location=${redirect_location}"

        create_routing_rule "${bucket}" "${prefix}" "${target}" "${redirect_location}"
    done

    IFS=${old_ifs}
}

change_origin_path() {
  tag_name=${1}
  cloudfront_distribution_id=${2}

  echo -e "Changing cloudfront origin..."
  current_distribution_config=$(aws cloudfront get-distribution --id ${cloudfront_distribution_id} --query "Distribution.DistributionConfig")
  current_origin_path=$(aws cloudfront get-distribution --id ${cloudfront_distribution_id} --query "Distribution.DistributionConfig.Origins.Items[?Id=='WebsiteBucketOrigin'].OriginPath" --output text)
  
  echo current_distribution_config
  echo $current_distribution_config
  etag=$(aws cloudfront get-distribution --id ${cloudfront_distribution_id} --query "ETag" --output text)
  [ -d tmp ] || mkdir tmp
  distribution_config_file_name="tmp/distribution_config.json"
  
  # update S3 bucket path
  new_origin_path="/${tag_name}"
  echo "${current_distribution_config//$current_origin_path/$new_origin_path}" > ${distribution_config_file_name}
  echo distribution_config_file_name
  cat ${distribution_config_file_name}
  aws cloudfront update-distribution --id ${cloudfront_distribution_id} --distribution-config file://${distribution_config_file_name} --if-match ${etag}
  echo -e "Done"
}

invalidate_cache() {
  cloudfront_distribution_id=${1}

  echo -e "Invalidating cloudfront cache..."
  aws cloudfront create-invalidation --distribution-id ${cloudfront_distribution_id} --paths "/*"
  echo -e "Done"
}

deploy_to_git_tag() {
  content_directory_path=${1}
  tag_name=${2}
  cloudfront_distribution_id=${3}
  bucket_name=${4}

  echo -e "Deploying ${tag_name}"
  sync_s3 ${content_directory_path} ${bucket_name} ${tag_name}

    if [ -n "$APPLY_ROUTING_RULES" ]; then
        create_routing_rules "${bucket_name}" "${tag_name}"
    fi
  
    if [ -n "$BLUE_GREEN_PUBLISH" ]; then
        change_origin_path ${tag_name} ${cloudfront_distribution_id}
        aws cloudfront wait distribution-deployed --id ${cloudfront_distribution_id}
    fi

    if [ -n "$INVALIDATE_CLOUDFRONT_CACHE" ]; then
        invalidate_cache ${cloudfront_distribution_id}
    fi
}

replace_in_file() {
  file_path=${1}
  search_value=${2}
  new_value=${3}
  sed -i "s/${search_value}/${new_value}/g" "${file_path}"
}

update_content_with_version() {
    file_path=${1}
    envsubst < "${file_path}" > "${file_path}.tmp"
    rm "${file_path}"
    mv "${file_path}.tmp" "${file_path}"
    # replace_in_file "${file_path}" "BUILD_SOURCEBRANCHNAME" "${BUILD_SOURCEBRANCHNAME}"
    # replace_in_file "${file_path}" "BUILD_SOURCEVERSION" "${BUILD_SOURCEVERSION}"
    # replace_in_file "${file_path}" "BUILD_SOURCEVERSIONMESSAGE" "${BUILD_SOURCEVERSIONMESSAGE}"
    cat ${file_path}
}

_publish-content() {
  branch="${BUILD_SOURCEBRANCHNAME}"
  content_directory_path=${CONTENT_DIRECTORY_PATH}
  index_file_path="${content_directory_path}/index.html"
  cloudfront_distribution_id=""
  bucket_name=""
  deploy_tag=""

  if [ "${branch}" = "develop" ]; then
    # TODO: chane the following to get staging distribution id and bucket name
    cloudfront_distribution_id=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='StagingCloudFrontDistributionId'].OutputValue" --output text)
    bucket_name=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='StagingWebsiteBucketName'].OutputValue" --output text)
    # tag name only.  no commit hash appended
    # deploy_tag=$(git describe --tags --abbrev=0)
    deploy_tag="${BUILD_SOURCEVERSION}" # commit sha-1 hash
  else
    cloudfront_distribution_id=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
    bucket_name=$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
    # tag name only.  no commit hash appended
    # deploy_tag=$(git describe --tags --abbrev=0)
    deploy_tag="${BUILD_SOURCEVERSION}" # commit sha-1 hash
  fi

  echo "
  branch=${branch}
  content_directory_path=${content_directory_path}
  index_file_path=${index_file_path}
  cloudfront_distribution_id=${cloudfront_distribution_id}
  bucket_name=${bucket_name}
  deploy_tag=${deploy_tag}
  "

  #exit 0

  if [ "${deploy_tag}" ]; then
    update_content_with_version ${index_file_path}
    deploy_to_git_tag ${content_directory_path} ${deploy_tag} ${cloudfront_distribution_id} ${bucket_name}
    echo -e "Deploy success"
  else
    echo -e "Deploy failure: no tag"
  fi
}

publish-content() {
    environment="$2"

    if [ "${environment}" = "staging" ]; then
        BUILD_SOURCEBRANCHNAME="develop"
    fi

    if [ "${environment}" = "production" ]; then
        BUILD_SOURCEBRANCHNAME="master"
    fi

    start_time="$(date -u +%s)"
    _publish-content "$@"
    end_time="$(date -u +%s)"
    elapsed="$(($end_time-$start_time))"
    echo "Total of $elapsed seconds elapsed for process"
}

tag-and-trigger-publish() {
    TAG_NAME=$1

    if [ -z "${TAG_NAME}" ]
    then
        TAG_NAME="v0.0.1"
    fi

    git tag -a "${TAG_NAME}" -m "releasing version ${TAG_NAME}"
    git push origin "${TAG_NAME}"
}

test-cmd() {
    echo "test"
}

case $CMD in
    test-cmd)
        test-cmd
    ;;
    bootstrap)
        bootstrap
    ;;
    deploy-infrastructure)
        deploy-infrastructure
    ;;
    describe-stack-outputs)
        describe-stack-outputs "$@"
    ;;
    publish-content)
        publish-content "$@"
    ;;
    tag-and-trigger-publish)
        tag-and-trigger-publish "$@"
    ;;
    delete-infrastructure)
        read -r -p "Are you sure want to delete the stack? [y/N] " response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
        then
            delete-infrastructure
        fi           
    ;;
esac
